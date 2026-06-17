import express from 'express';
import cors from 'cors';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformToFrontendFormat } from './helpers/transform-to-frontend-format.js';

const app = express();
const PORT = 3000;

// ====================
// Paths
// ====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'collections.json');
const ENVIRONMENTS_FILE = path.join(DATA_DIR, 'environments.json');

// Create data folder if missing
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create empty collections file if missing
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

// Create empty environments file if missing
if (!fs.existsSync(ENVIRONMENTS_FILE)) {
  fs.writeFileSync(ENVIRONMENTS_FILE, '[]');
}

// ====================
// Middleware
// ====================

app.use(express.json());

// ====================
// Health
// ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ====================
// Root
// ====================

app.get('/api', (req, res) => {
  res.json({
    name: 'memOK Proxy Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      collections: 'GET /api/collections',
      saveCollections: 'POST /api/collections',
      environments: 'GET /api/environments',
      createEnvironment: 'POST /api/environments',
      updateEnvironment: 'PUT /api/environments/:id',
      deleteEnvironment: 'DELETE /api/environments/:id',
      importEnvironments: 'POST /api/environments/import',
      proxy: 'POST /proxy?url={target_url}',
      parseCurl: 'POST /parse-curl',
    },
  });
});

// ====================
// Collections
// ====================

app.get('/api/collections', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');

    if (!data.trim()) {
      return res.json([]);
    }

    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading collections:', err);

    res.status(500).json({
      error: 'Failed to load collections',
    });
  }
});

app.post('/api/collections', (req, res) => {
  const { collectionId, name, icon, requests, isExpanded } = req.body;

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const collections = JSON.parse(data || '[]');

    const exists = collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'A collection with that name already exists.' });
    }

    const newCollection = { collectionId, name, icon, requests, isExpanded };
    collections.push(newCollection);

    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2));

    res.status(200).json(newCollection);
  } catch (err) {
    res.status(500).json({ error: 'Internal error saving' });
  }
});

app.put('/api/collections/:collectionId', (req, res) => {
  const { collectionId } = req.params;
  const updateData = req.body;

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const collections = JSON.parse(data || '[]');

    const collection = collections.find((c) => c.collectionId === collectionId);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Update the collection with the provided data
    Object.assign(collection, updateData);

    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2));

    res.status(200).json(collection);
  } catch (err) {
    console.error('Error updating collection:', err);
    res.status(500).json({ error: 'Internal error updating collection' });
  }
});

app.post('/api/requests', (req, res) => {
  const newRequest = req.body;

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const collections = JSON.parse(data || '[]');

    const collection = collections.find((c) => c.collectionId === newRequest.collectionId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (!newRequest.requestId || newRequest.requestId === '') {
      newRequest.requestId = crypto.randomUUID();
    }

    // Verificar si ya existe (por si es actualización)
    const existingIndex = collection.requests.findIndex((r) => r.requestId === newRequest.requestId);

    if (existingIndex !== -1) {
      collection.requests[existingIndex] = newRequest;
    } else {
      collection.requests.push(newRequest);
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2));

    res.status(200).json({
      message: existingIndex !== -1 ? 'Request updated successfully' : 'Request added successfully',
      request: newRequest
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ====================
// Requests - PUT (Update)
// ====================

app.put('/api/requests/:requestId', (req, res) => {
  const { requestId } = req.params;
  const updateData = req.body;

  console.log(`Updating request ${requestId}:`, updateData);

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const collections = JSON.parse(data || '[]');

    let found = false;
    let updatedRequest = null;

    for (const collection of collections) {
      const requestIndex = collection.requests.findIndex((r) => r.requestId === requestId);

      if (requestIndex !== -1) {
        // Actualizar la request existente
        const existingRequest = collection.requests[requestIndex];
        collection.requests[requestIndex] = {
          ...existingRequest,
          ...updateData,
          requestId: requestId // Asegurar que el ID no cambie
        };
        found = true;
        updatedRequest = collection.requests[requestIndex];
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ error: 'Request not found' });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2));
    console.log(`Request ${requestId} updated successfully`);

    res.status(200).json({
      message: 'Request updated successfully',
      request: updatedRequest
    });
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: 'Internal error updating request' });
  }
});

// ====================
// ENVIRONMENTS CRUD
// ====================

// Get all environments
app.get('/api/environments', (req, res) => {
  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');

    if (!data.trim()) {
      return res.json([]);
    }

    const environments = JSON.parse(data);
    res.json(environments);
  } catch (err) {
    console.error('Error reading environments:', err);
    res.status(500).json({
      error: 'Failed to load environments',
    });
  }
});

// Get a single environment by ID
app.get('/api/environments/:id', (req, res) => {
  const { id } = req.params;

  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    const environments = JSON.parse(data || '[]');

    const environment = environments.find((env) => env.id === id);

    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    res.json(environment);
  } catch (err) {
    console.error('Error reading environment:', err);
    res.status(500).json({ error: 'Failed to load environment' });
  }
});

// Create a new environment
app.post('/api/environments', (req, res) => {
  const { id, name, variables, createdAt, updatedAt } = req.body;

  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    const environments = JSON.parse(data || '[]');

    // Check if environment with same name exists
    const exists = environments.find((env) => env.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.status(409).json({
        error: 'An environment with that name already exists.'
      });
    }

    const newEnvironment = {
      id: id || crypto.randomUUID(),
      name: name.trim(),
      variables: variables || [],
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    };

    environments.push(newEnvironment);

    fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(environments, null, 2));

    res.status(201).json(newEnvironment);
  } catch (err) {
    console.error('Error creating environment:', err);
    res.status(500).json({ error: 'Internal error creating environment' });
  }
});

// Update an existing environment
app.put('/api/environments/:id', (req, res) => {
  const { id } = req.params;
  const { name, variables } = req.body;

  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    let environments = JSON.parse(data || '[]');

    const environmentIndex = environments.findIndex((env) => env.id === id);

    if (environmentIndex === -1) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // Check if another environment with same name exists (excluding current)
    const duplicateName = environments.find(
      (env) => env.name.toLowerCase() === name.toLowerCase() && env.id !== id
    );
    if (duplicateName) {
      return res.status(409).json({
        error: 'An environment with that name already exists.'
      });
    }

    const updatedEnvironment = {
      ...environments[environmentIndex],
      name: name.trim(),
      variables: variables || [],
      updatedAt: new Date().toISOString(),
    };

    environments[environmentIndex] = updatedEnvironment;

    fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(environments, null, 2));

    res.status(200).json(updatedEnvironment);
  } catch (err) {
    console.error('Error updating environment:', err);
    res.status(500).json({ error: 'Internal error updating environment' });
  }
});

// Delete an environment
app.delete('/api/environments/:id', (req, res) => {
  const { id } = req.params;

  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    let environments = JSON.parse(data || '[]');

    const environmentIndex = environments.findIndex((env) => env.id === id);

    if (environmentIndex === -1) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    environments.splice(environmentIndex, 1);

    fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(environments, null, 2));

    res.status(200).json({
      message: 'Environment deleted successfully',
      id: id
    });
  } catch (err) {
    console.error('Error deleting environment:', err);
    res.status(500).json({ error: 'Internal error deleting environment' });
  }
});

// Import multiple environments
app.post('/api/environments/import', (req, res) => {
  const { environments: importedEnvironments } = req.body;

  if (!importedEnvironments || !Array.isArray(importedEnvironments)) {
    return res.status(400).json({
      error: 'Invalid format: expected { environments: [...] }'
    });
  }

  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    let existingEnvironments = JSON.parse(data || '[]');

    // Process each imported environment
    const processedEnvironments = importedEnvironments.map((env) => {
      // Check if environment with same ID exists
      const existing = existingEnvironments.find((e) => e.id === env.id);

      if (existing) {
        // Update existing
        return {
          ...existing,
          ...env,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Create new
        return {
          id: env.id || crypto.randomUUID(),
          name: env.name.trim(),
          variables: env.variables || [],
          createdAt: env.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    });

    // Merge: keep environments that weren't imported, add/update imported ones
    const mergedEnvironments = [...existingEnvironments];

    for (const processed of processedEnvironments) {
      const index = mergedEnvironments.findIndex((e) => e.id === processed.id);
      if (index !== -1) {
        mergedEnvironments[index] = processed;
      } else {
        mergedEnvironments.push(processed);
      }
    }

    fs.writeFileSync(ENVIRONMENTS_FILE, JSON.stringify(mergedEnvironments, null, 2));

    res.status(200).json({
      message: `Imported ${processedEnvironments.length} environments successfully`,
      environments: processedEnvironments,
    });
  } catch (err) {
    console.error('Error importing environments:', err);
    res.status(500).json({ error: 'Internal error importing environments' });
  }
});

// Export all environments (GET with export flag)
app.get('/api/environments/export', (req, res) => {
  try {
    const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
    const environments = JSON.parse(data || '[]');

    res.status(200).json({
      exportedAt: new Date().toISOString(),
      count: environments.length,
      environments: environments,
    });
  } catch (err) {
    console.error('Error exporting environments:', err);
    res.status(500).json({ error: 'Internal error exporting environments' });
  }
});

// ====================
// Helper: Resolve environment variables in a request
// ====================

app.post('/api/environments/resolve', (req, res) => {
  const { environmentId, text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text to resolve' });
  }

  try {
    let result = text;

    // If environmentId is provided, use that specific environment
    if (environmentId) {
      const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
      const environments = JSON.parse(data || '[]');
      const environment = environments.find((env) => env.id === environmentId);

      if (environment) {
        for (const variable of environment.variables) {
          const placeholder = `{{${variable.key}}}`;
          result = result.replace(new RegExp(placeholder, 'g'), variable.value);
        }
      }
    } else {
      // Try to resolve using all environments (use first one that matches)
      const data = fs.readFileSync(ENVIRONMENTS_FILE, 'utf-8');
      const environments = JSON.parse(data || '[]');

      for (const env of environments) {
        let tempResult = text;
        for (const variable of env.variables) {
          const placeholder = `{{${variable.key}}}`;
          tempResult = tempResult.replace(new RegExp(placeholder, 'g'), variable.value);
        }
        if (tempResult !== text) {
          result = tempResult;
          break;
        }
      }
    }

    res.json({
      original: text,
      resolved: result,
      environmentId: environmentId || 'auto-detected',
    });
  } catch (err) {
    console.error('Error resolving variables:', err);
    res.status(500).json({ error: 'Internal error resolving variables' });
  }
});

// ====================
// Proxy Request
// ====================

app.post('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  const start = Date.now();

  if (!targetUrl) {
    return res.status(400).json({
      error: 'Missing URL parameter',
    });
  }

  console.log(`[${new Date().toISOString()}] ${req.body.method || 'GET'} ${targetUrl}`);

  try {
    const response = await axios({
      method: req.body.method || 'GET',
      url: targetUrl,
      headers: req.body.headers || {},
      data: req.body.body || null,
      timeout: 30000,
      validateStatus: () => true,
    });

    const duration = Date.now() - start;

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      duration: `${duration}ms`,
      body: response.data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Proxy error:', err.message);

    res.status(500).json({
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ====================
// Parse cURL
// ====================

app.post('/api/parse-curl', async (req, res) => {
  const { curl } = req.body;

  if (!curl) {
    return res.status(400).json({ error: 'Missing curl field in body' });
  }

  try {
    const { toJsonObject } = await import('curlconverter');

    const cleanCurl = curl.replace(/\\\n/g, ' ').replace(/\s+/g, ' ');

    const rawParsed = toJsonObject(cleanCurl);

    const formattedResponse = transformToFrontendFormat(rawParsed);

    res.json(formattedResponse);
  } catch (err) {
    res.status(400).json({ error: `Invalid cURL command: ${err.message}` });
  }
});

// Delete a collection
app.delete('/api/collections/:collectionId', (req, res) => {
  const { collectionId } = req.params;

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    let collections = JSON.parse(data || '[]');

    const collectionIndex = collections.findIndex(c => c.collectionId === collectionId);

    if (collectionIndex === -1) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    collections.splice(collectionIndex, 1);

    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2));

    res.status(200).json({
      message: 'Collection deleted successfully',
      collectionId: collectionId
    });
  } catch (err) {
    console.error('Error deleting collection:', err);
    res.status(500).json({ error: 'Internal error deleting collection' });
  }
});

// Delete a request from a collection
app.delete('/api/collections/:collectionId/requests/:requestId', (req, res) => {
  const { collectionId, requestId } = req.params;

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    let collections = JSON.parse(data || '[]');

    const collection = collections.find(c => c.collectionId === collectionId);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const requestIndex = collection.requests.findIndex(r => r.requestId === requestId);

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    collection.requests.splice(requestIndex, 1);

    fs.writeFileSync(DATA_FILE, JSON.stringify(collections, null, 2));

    res.status(200).json({
      message: 'Request deleted successfully',
      requestId: requestId
    });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ error: 'Internal error deleting request' });
  }
});

// ====================
// Start Server
// ====================

app.listen(PORT, () => {
  console.log('\n🚀 MemOK Proxy Server');
  console.log(`📍 Server running at http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📄 Collections file: ${DATA_FILE}`);
  console.log(`📄 Environments file: ${ENVIRONMENTS_FILE}`);
  console.log('\n✅ Server is ready!\n');
});
