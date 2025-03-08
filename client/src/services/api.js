import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CARDS_URL = '/api/cards';
const SETS_URL = '/api/sets';
const AUTH_URL = '/api/auth';
const KEYWORDS_URL = '/api/keywords';

console.log('API URL:', process.env.REACT_APP_API_URL);

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication API Functions

// Login user
export const login = async (username, password) => {
  try {
    console.log('API login called with:', { username, passwordLength: password?.length });
    const response = await api.post(`${AUTH_URL}/login`, { username, password });
    console.log('Login response:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await api.get(`${AUTH_URL}/me`);
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

// Initialize admin user
export const initAdmin = async () => {
  try {
    const response = await api.post(`${AUTH_URL}/init-admin`);
    return response.data;
  } catch (error) {
    console.error('Error initializing admin user:', error);
    throw error;
  }
};

// Card API Functions

// Get all cards
export const getCards = async () => {
  try {
    console.log('Making request to:', BASE_URL + CARDS_URL);
    const response = await api.get(CARDS_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching cards:', error);
    console.error('Request URL:', error.config?.url);
    console.error('Base URL:', BASE_URL);
    throw error;
  }
};

// Get a single card by ID
export const getCard = async (id) => {
  try {
    const response = await api.get(`${CARDS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching card with ID ${id}:`, error);
    throw error;
  }
};

// Create a new card
export const createCard = async (formData) => {
  try {
    const response = await api.post(CARDS_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating card:', error);
    throw error;
  }
};

// Update a card
export const updateCard = async (id, formData) => {
  try {
    const response = await api.patch(`${CARDS_URL}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating card with ID ${id}:`, error);
    throw error;
  }
};

// Delete a card
export const deleteCard = async (id) => {
  try {
    const response = await api.delete(`${CARDS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting card with ID ${id}:`, error);
    throw error;
  }
};

// Set API Functions

// Get all sets
export const getSets = async () => {
  try {
    const response = await api.get(SETS_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching sets:', error);
    throw error;
  }
};

// Get a single set by ID with populated cards
export const getSet = async (id) => {
  try {
    const response = await api.get(`${SETS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching set with ID ${id}:`, error);
    throw error;
  }
};

// Create a new set
export const createSet = async (setData) => {
  try {
    const response = await api.post(SETS_URL, setData);
    return response.data;
  } catch (error) {
    console.error('Error creating set:', error);
    throw error;
  }
};

// Update a set
export const updateSet = async (id, setData) => {
  try {
    const response = await api.patch(`${SETS_URL}/${id}`, setData);
    return response.data;
  } catch (error) {
    console.error(`Error updating set with ID ${id}:`, error);
    throw error;
  }
};

// Delete a set
export const deleteSet = async (id) => {
  try {
    const response = await api.delete(`${SETS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting set with ID ${id}:`, error);
    throw error;
  }
};

// Add a card to a set
export const addCardToSet = async (setId, cardId) => {
  try {
    const response = await api.post(`${SETS_URL}/${setId}/cards/${cardId}`);
    return response.data;
  } catch (error) {
    console.error(`Error adding card ${cardId} to set ${setId}:`, error);
    throw error;
  }
};

// Remove a card from a set
export const removeCardFromSet = async (setId, cardId) => {
  try {
    const response = await api.delete(`${SETS_URL}/${setId}/cards/${cardId}`);
    return response.data;
  } catch (error) {
    console.error(`Error removing card ${cardId} from set ${setId}:`, error);
    throw error;
  }
};

// Keyword API Functions

// Get all keywords
export const getKeywords = async () => {
  try {
    const response = await api.get(KEYWORDS_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching keywords:', error);
    throw error;
  }
};

// Get a single keyword by ID
export const getKeyword = async (id) => {
  try {
    const response = await api.get(`${KEYWORDS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching keyword with ID ${id}:`, error);
    throw error;
  }
};

// Create a new keyword
export const createKeyword = async (formData) => {
  try {
    const response = await api.post(KEYWORDS_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating keyword:', error);
    throw error;
  }
};

// Update a keyword
export const updateKeyword = async (id, formData) => {
  try {
    const response = await api.patch(`${KEYWORDS_URL}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating keyword with ID ${id}:`, error);
    throw error;
  }
};

// Delete a keyword
export const deleteKeyword = async (id) => {
  try {
    const response = await api.delete(`${KEYWORDS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting keyword with ID ${id}:`, error);
    throw error;
  }
}; 