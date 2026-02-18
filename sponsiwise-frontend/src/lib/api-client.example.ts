/**
 * Example usage of API client
 * This file demonstrates how to use the API client - NOT for production use
 */

import { apiClient, ApiError } from "./api-client";

// =============================================================================
// Type definitions (move to dedicated types file in real usage)
// =============================================================================

interface User {
  id: string;
  email: string;
  name: string;
}

interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
}

// =============================================================================
// Example: GET request (without auth)
// =============================================================================

export async function getPublicData() {
  try {
    const users = await apiClient.get<User[]>("/users");
    return users;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error ${error.status}: ${error.message}`);
    }
    throw error;
  }
}

// =============================================================================
// Example: GET request (with auth token)
// =============================================================================

export async function getUserProfile(token: string) {
  try {
    const user = await apiClient.get<User>("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Handle unauthorized - token expired or invalid
      console.error("Unauthorized: Invalid or expired token");
    }
    throw error;
  }
}

// =============================================================================
// Example: POST request (create resource)
// =============================================================================

export async function createUser(payload: CreateUserPayload) {
  try {
    const newUser = await apiClient.post<User>("/users", payload);
    return newUser;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        console.error("Validation error:", error.message);
      } else if (error.status === 409) {
        console.error("User already exists");
      }
    }
    throw error;
  }
}

// =============================================================================
// Example: POST request with auth (authenticated action)
// =============================================================================

export async function createSponsor(
  token: string,
  data: { name: string; website: string }
) {
  return apiClient.post("/sponsors", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
