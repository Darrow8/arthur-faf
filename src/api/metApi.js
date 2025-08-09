import metService from './metService';

/**
 * Simple interface for interacting with the MET API
 */
const metApi = {
  /**
   * Search for artworks based on criteria
   * @param {string} subject - Subject matter to search for
   * @param {string|number} theme - Theme or department ID
   * @param {Object} dimensions - Size constraints
   * @returns {Promise<Array>} - Matching artworks
   */
  searchArt: (subject, theme, dimensions) => {
    return metService.searchArtworks({ subject, theme, dimensions });
  },
  
  /**
   * Get a specific artwork by ID
   * @param {number} id - Artwork ID
   * @returns {Promise<Object>} - Artwork details
   */
  getArtwork: (id) => {
    return metService.getArtworkDetails(id);
  },
  
  /**
   * Get all available departments/themes
   * @returns {Promise<Array>} - List of departments
   */
  getThemes: () => {
    return metService.getDepartments();
  }
};

export default metApi;