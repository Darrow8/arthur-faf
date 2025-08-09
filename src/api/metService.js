// metService.js
import axios from 'axios';
import RNFS from 'react-native-fs';

const BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

class MetService {
  /**
   * Search for art pieces and return top result with image
   * @param {string} subject - Subject to search for
   * @returns {Promise<Object|null>} - Top artwork with image
   */
  async getTopArtworkWithImage(subject) {
    try {
      // Search for artworks matching the subject
      const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(subject)}`;
      const searchResponse = await axios.get(searchUrl);
      
      if (!searchResponse.data.objectIDs || searchResponse.data.objectIDs.length === 0) {
        console.log('No artworks found for subject:', subject);
        return null;
      }
      
      // Get details for the first 10 results to find one with an image
      const objectIDs = searchResponse.data.objectIDs.slice(0, 10);
      
      for (const id of objectIDs) {
        const artwork = await this.getArtworkDetails(id);
        
        // Return the first artwork that has an image
        if (artwork && artwork.primaryImage) {
          return artwork;
        }
      }
      
      console.log('No artworks with images found for subject:', subject);
      return null;
    } catch (error) {
      console.error('Error fetching artwork:', error);
      return null;
    }
  }
  
  /**
   * Get detailed information about a specific artwork
   * @param {number} id - Object ID
   * @returns {Promise<Object|null>} - Artwork details or null if not found
   */
  async getArtworkDetails(id) {
    try {
      const response = await axios.get(`${BASE_URL}/objects/${id}`);
      const artwork = response.data;
      
      return {
        id: artwork.objectID,
        title: artwork.title,
        artist: artwork.artistDisplayName,
        date: artwork.objectDate,
        primaryImage: artwork.primaryImage,
        primaryImageSmall: artwork.primaryImageSmall,
      };
    } catch (error) {
      console.error(`Error fetching artwork details for ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Download artwork image and prepare it for AR
   * @param {Object} artwork - Artwork object with image URL
   * @returns {Promise<string>} - Path to the downloaded image
   */
  async downloadArtworkImage(artwork) {
    if (!artwork || !artwork.primaryImage) {
      throw new Error('No artwork image available');
    }
    
    const imageUrl = artwork.primaryImage;
    const filename = `met_artwork_${artwork.id}.jpg`;
    const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;
    
    try {
      // Check if file already exists
      if (await RNFS.exists(filePath)) {
        console.log('Artwork image already cached at', filePath);
        return filePath;
      }
      
      // Download the image
      console.log('Downloading artwork image from', imageUrl);
      const result = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: filePath,
      }).promise;
      
      if (result.statusCode === 200) {
        console.log('Artwork image downloaded successfully to', filePath);
        return filePath;
      } else {
        throw new Error(`Failed to download image: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Error downloading artwork image:', error);
      throw error;
    }
  }
}

export default new MetService();