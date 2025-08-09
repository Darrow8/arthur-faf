// artTo3dService.js
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

class ArtTo3dService {
  /**
   * Convert artwork image to a 3D model format for AR
   * @param {string} imagePath - Path to the downloaded image
   * @returns {Promise<Object>} - AR model configuration
   */
  async convertImageTo3dModel(imagePath) {
    // For iOS: Create a plane with the image as a texture
    if (Platform.OS === 'ios') {
      return this.createImagePlaneForIOS(imagePath);
    }
    
    // For Android: Create a GLB with the image as a texture on a plane
    return this.createImagePlaneForAndroid(imagePath);
  }
  
  /**
   * For iOS: Create AR configuration using react-native-arkit
   * @param {string} imagePath - Path to the image
   * @returns {Promise<Object>} - AR configuration for iOS
   */
  async createImagePlaneForIOS(imagePath) {
    try {
      // Get image dimensions to maintain aspect ratio
      const imageInfo = await RNFS.stat(imagePath);
      
      // Create a configuration object for react-native-arkit
      return {
        type: 'plane',
        platform: 'ios',
        imagePath: imagePath,
        // This will be used directly with ARKit components
        arConfig: {
          material: {
            diffuse: {
              path: imagePath,
              wrapS: 'clamp',
              wrapT: 'clamp',
            }
          },
          width: 1.0,  // Base width in meters
          height: 1.0, // Will be adjusted based on aspect ratio
          chamferRadius: 0.0,
        }
      };
    } catch (error) {
      console.error('Error creating iOS AR model:', error);
      throw error;
    }
  }
  
  /**
   * For Android: Create AR configuration for GLB/glTF format
   * @param {string} imagePath - Path to the image
   * @returns {Promise<Object>} - AR configuration for Android
   */
  async createImagePlaneForAndroid(imagePath) {
    // For Android, we'll use a simpler approach since we're using react-native-ar-viewer
    // which expects a GLB file URL or a local path
    
    // In a production app, you would:
    // 1. Use a service to convert the image to a GLB with the image as a texture
    // 2. Or include a pre-made GLB template and modify it with the image
    
    // For this example, we'll create a configuration that can be used with a custom renderer
    return {
      type: 'plane',
      platform: 'android',
      imagePath: imagePath,
      // This would typically be a URL to a GLB file
      // For demo purposes, we'll use the image directly and handle the conversion in the AR component
      modelPath: null,
      textureSource: imagePath
    };
  }
  
  /**
   * Generate a temporary HTML file that displays the image in a 3D context
   * This can be used as a fallback approach for platforms without native AR support
   * @param {string} imagePath - Path to the image
   * @returns {Promise<string>} - Path to the HTML file
   */
  async generateImageHtml(imagePath) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://aframe.io/releases/1.2.0/aframe.min.js"></script>
        <style>
          body { margin: 0; overflow: hidden; }
          .scene-container { position: absolute; width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div class="scene-container">
          <a-scene>
            <a-assets>
              <img id="artwork" src="file://${imagePath}" />
            </a-assets>
            <a-plane position="0 1.5 -3" rotation="0 0 0" width="3" height="2" material="src: #artwork"></a-plane>
            <a-sky color="#ECECEC"></a-sky>
          </a-scene>
        </div>
      </body>
      </html>
    `;
    
    const htmlPath = `${RNFS.CachesDirectoryPath}/artwork_viewer.html`;
    await RNFS.writeFile(htmlPath, htmlContent, 'utf8');
    return htmlPath;
  }
}

export default new ArtTo3dService();