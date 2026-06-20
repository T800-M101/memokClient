# MemokClient

**MemokClient** is a modern API testing and management tool built with Angular. It allows developers to create, organize, test, and manage API requests through collections, environments, Google Drive synchronization, and cURL import support.

---

## Table of Contents

- [MemokClient](#memokclient)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation \& Setup](#installation--setup)
    - [1. Clone the repository](#1-clone-the-repository)
    - [2. Install dependencies](#2-install-dependencies)
    - [3. Start the Angular application](#3-start-the-angular-application)
    - [4. Start the backend server](#4-start-the-backend-server)
- [Development](#development)
  - [Code Scaffolding](#code-scaffolding)
  - [Build](#build)
  - [Testing](#testing)
- [Project Structure](#project-structure)
- [Usage](#usage)
  - [Creating a Request](#creating-a-request)
  - [Managing Collections](#managing-collections)
    - [Create Collection](#create-collection)
    - [Add Request](#add-request)
    - [Expand / Collapse](#expand--collapse)
    - [Delete](#delete)
  - [Using Environments](#using-environments)
  - [Importing cURL](#importing-curl)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)
- [Roadmap](#roadmap)

---

## Features

- 🚀 **Request Management** - Create, save, and organize API requests.
- 📁 **Collections** - Group requests into collections.
- 🌍 **Environments** - Manage environment variables for Development, Staging, and Production.
- 🔄 **Variable Resolution** - Use `{{variable_name}}` syntax in URLs, headers, and request bodies.
- 📋 **cURL Import** - Import existing cURL commands with automatic parsing.
- ☁️ **Google Drive Sync** - Backup and synchronize collections and environments.
- 🎨 **Dark / Light Theme** - Automatically follows system preferences.
- 📊 **JSON Editor** - Built-in JSON editing and validation.
- 🔐 **Authentication Support** - Bearer Token, Basic Auth, and custom headers.
- ⚡ **Angular Signals** - Modern reactive state management.

---

# Quick Start

## Prerequisites

- Node.js 18+
- npm 9+

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/memok-client.git
cd memok-client
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the Angular application

```bash
npm start
```

This runs:

```bash
ng serve --proxy-config proxy.config.json
```

and proxies `/api` requests to the backend server.

Open:

```text
http://localhost:4200
```

### 4. Start the backend server

In a separate terminal:

```bash
npm run server
```

This starts the Express backend responsible for:

- Collections
- Requests
- Environments
- HTTP Proxy
- cURL Parsing

---

# Development

## Code Scaffolding

Generate new Angular components:

```bash
ng generate component components/component-name
```

Generate new services:

```bash
ng generate service services/service-name
```

---

## Build

Build the application for production:

```bash
npm run build
```

Artifacts will be generated in:

```text
dist/
```

---

## Testing

Run unit tests:

```bash
npm test
```

---

# Project Structure

```text
memok-client/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── auth-service/
│   │   │   │   ├── drive-service/
│   │   │   │   ├── requests-service/
│   │   │   │   ├── env-service/
│   │   │   │   └── notifications/
│   │   │   ├── interfaces/
│   │   │   └── models/
│   │   │
│   │   ├── components/
│   │   │   ├── sidebar/
│   │   │   ├── working-area/
│   │   │   ├── request-bar/
│   │   │   ├── config-bar/
│   │   │   ├── topbar/
│   │   │   └── overlay-menu/
│   │   │
│   │   └── app.ts
│   │
│   ├── styles/
│   └── index.html
│
├── server/
│   └── server.js
│
├── proxy.config.json
├── package.json
└── README.md
```

---

# Usage

## Creating a Request

1. Click **New Request**.
2. Enter a request name.
3. Select an HTTP method.
4. Enter the target URL.
5. Configure:
   - Params
   - Headers
   - Body
   - Authentication
6. Click **Send**.

---

## Managing Collections

### Create Collection

Click the **+ Collection** button in the sidebar.

### Add Request

Create a new request and assign it to a collection.

### Expand / Collapse

Click a collection header.

### Delete

Hover over a collection or request and click the delete icon.

---

## Using Environments

1. Open the side menu.
2. Select **Environments**.
3. Create a new environment.
4. Define variables.

Example:

```json
{
  "protocol": "https",
  "host": "api.example.com",
  "port": "443",
  "jwt": "your-jwt-token"
}
```

Usage:

```text
{{protocol}}://{{host}}/api/users
```

Headers:

```text
Authorization: Bearer {{jwt}}
```

---

## Importing cURL

1. Open the side menu.
2. Select **Import cURL**.
3. Paste your command.
4. Click **Import**.

Example:

```bash
curl -X GET \
"https://api.example.com/users" \
-H "Authorization: Bearer token"
```

The request will be automatically converted into a MemokClient request.

---

# Technologies Used

- Angular 20
- TypeScript
- Angular Signals
- RxJS
- Express.js
- Google Drive API
- curlconverter
- Font Awesome

---

# Contributing

1. Fork the repository.
2. Create a branch:

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes:

```bash
git commit -m "Add amazing feature"
```

4. Push your branch:

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request.

---

# License

This project is currently private and not licensed for redistribution.

---

# Roadmap

- [x] Collections
- [x] Environments
- [x] Variable Resolution
- [x] cURL Import
- [x] Google Drive Sync
- [ ] Request History
- [ ] API Documentation Viewer
- [ ] GraphQL Support
- [ ] WebSocket Testing
- [ ] Team Collaboration

---

Built with ❤️ using Angular.
