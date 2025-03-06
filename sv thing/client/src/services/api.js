import axios from 'axios';

const CARDS_URL = '/api/cards';
const SETS_URL = '/api/sets';

// Card API Functions

// Get all cards
export const getCards = async () => {
  try {
    const response = await axios.get(CARDS_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
};

// Get a single card by ID
export const getCard = async (id) => {
  try {
    const response = await axios.get(`${CARDS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching card with ID ${id}:`, error);
    throw error;
  }
};

// Create a new card
export const createCard = async (formData) => {
  try {
    const response = await axios.post(CARDS_URL, formData, {
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
    const response = await axios.patch(`${CARDS_URL}/${id}`, formData, {
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
    const response = await axios.delete(`${CARDS_URL}/${id}`);
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
    const response = await axios.get(SETS_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching sets:', error);
    throw error;
  }
};

// Get a single set by ID with populated cards
export const getSet = async (id) => {
  try {
    const response = await axios.get(`${SETS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching set with ID ${id}:`, error);
    throw error;
  }
};

// Create a new set
export const createSet = async (setData) => {
  try {
    const response = await axios.post(SETS_URL, setData);
    return response.data;
  } catch (error) {
    console.error('Error creating set:', error);
    throw error;
  }
};

// Update a set
export const updateSet = async (id, setData) => {
  try {
    const response = await axios.patch(`${SETS_URL}/${id}`, setData);
    return response.data;
  } catch (error) {
    console.error(`Error updating set with ID ${id}:`, error);
    throw error;
  }
};

// Delete a set
export const deleteSet = async (id) => {
  try {
    const response = await axios.delete(`${SETS_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting set with ID ${id}:`, error);
    throw error;
  }
};

// Add a card to a set
export const addCardToSet = async (setId, cardId) => {
  try {
    const response = await axios.post(`${SETS_URL}/${setId}/cards/${cardId}`);
    return response.data;
  } catch (error) {
    console.error(`Error adding card ${cardId} to set ${setId}:`, error);
    throw error;
  }
};

// Remove a card from a set
export const removeCardFromSet = async (setId, cardId) => {
  try {
    const response = await axios.delete(`${SETS_URL}/${setId}/cards/${cardId}`);
    return response.data;
  } catch (error) {
    console.error(`Error removing card ${cardId} from set ${setId}:`, error);
    throw error;
  }
}; 