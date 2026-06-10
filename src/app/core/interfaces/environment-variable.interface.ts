export interface EnvironmentVariable {
  key: string;
  value: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
}

export interface EnvironmentGroup {
  id: string;
  name: string;
  environments: Environment[];
}
