import axios from 'axios';

const RATINGS_API_URL = '/api/ratings';

const getAuthHeaders = () => ({
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export const getPendingRatings = async () => {
  const response = await axios.get(`${RATINGS_API_URL}/pending`, getAuthHeaders());
  return response.data;
};

export const getRatingQuote = async (quoteId) => {
  const response = await axios.get(`${RATINGS_API_URL}/quote/${quoteId}`, getAuthHeaders());
  return response.data;
};

export const createRating = async (payload) => {
  const response = await axios.post(RATINGS_API_URL, payload, getAuthHeaders());
  return response.data;
};

export const getBarberRatings = async () => {
  const response = await axios.get(`${RATINGS_API_URL}/barberos`, getAuthHeaders());
  return response.data;
};

export const getRatingMetrics = async () => {
  const response = await axios.get(`${RATINGS_API_URL}/metrics`, getAuthHeaders());
  return response.data;
};

export const createClientRating = async (payload) => {
  const response = await axios.post(`${RATINGS_API_URL}/cliente`, payload, getAuthHeaders());
  return response.data;
};
