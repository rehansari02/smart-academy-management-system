import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/master/home-stats`;

const homeStatsService = {
  getPublicHomeStats: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  }
};

export default homeStatsService;
