// App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  PermissionsAndroid,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { ArViewerView } from 'react-native-ar-viewer';
import RNFS from 'react-native-fs';
import VoiceAgent from './src/VoiceAgent';
import metService from './src/api/metService';
import artTo3dService from './src/api/artTo3dService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [iosModelPath, setIosModelPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [artwork, setArtwork] = useState<any>(null);
  const [artworkImagePath, setArtworkImagePath] = useState<string | null>(null);
  const [showDefaultDemo, setShowDefaultDemo] = useState<boolean>(true);

  // Default demo model
  const demoModel = useMemo(
    () => {
      if (showDefaultDemo) {
        return Platform.OS === 'android'
          ? 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb'
          : iosModelPath ?? '';
      } else {
        return artworkImagePath ?? '';
      }
    },
    [iosModelPath, showDefaultDemo, artworkImagePath]
  );

  // Original useEffect for demo model setup
  useEffect(() => {
    if (!showDefaultDemo) return;

    // Android: request camera permission at runtime
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      return;
    }

    // iOS: download a sample USDZ locally for ARKit
    const download = async () => {
      try {
        const urlPrimary = 'https://developer.apple.com/augmented-reality/quick-look/models/teapot/teapot.usdz';
        const urlFallback = 'https://developer.apple.com/augmented-reality/quick-look/models/retrotv/retrotv.usdz';
        const destPath = RNFS.CachesDirectoryPath + '/sample.usdz';
        if (await RNFS.exists(destPath)) {
          console.log('USDZ already cached at', destPath);
          setIosModelPath(destPath);
          return;
        }
        console.log('Downloading USDZ from', urlPrimary);
        let res = await RNFS.downloadFile({ fromUrl: urlPrimary, toFile: destPath }).promise;
        if (res.statusCode !== 200) {
          console.log('Primary USDZ download failed, status:', res.statusCode, 'retrying fallback');
          res = await RNFS.downloadFile({ fromUrl: urlFallback, toFile: destPath }).promise;
        }
        console.log('USDZ download status', res.statusCode, '->', destPath);
        if (res.statusCode === 200) setIosModelPath(destPath);
      } catch (e) {
        console.log('USDZ download error', e);
      }
    };
    download();
  }, [showDefaultDemo]);

  // Function to search for artwork and prepare it for AR
  const searchAndPrepareArtwork = async () => {
    if (!searchText.trim()) return;

    setIsLoading(true);
    setShowDefaultDemo(false);
    setArtworkImagePath(null);

    try {
      // 1. Search for artwork
      const artworkData = await metService.getTopArtworkWithImage(searchText);
      if (!artworkData) {
        console.log('No suitable artwork found');
        setIsLoading(false);
        return;
      }

      setArtwork(artworkData);

      // 2. Download the artwork image
      const imagePath = await metService.downloadArtworkImage(artworkData);

      // 3. Convert the image to a 3D model format
      const arConfig = await artTo3dService.convertImageTo3dModel(imagePath);

      // Update the model path based on platform
      if (Platform.OS === 'ios') {
        setArtworkImagePath(arConfig.imagePath);
      } else {
        setArtworkImagePath(arConfig.imagePath);
      }
    } catch (error) {
      console.error('Error preparing artwork for AR:', error);
      setShowDefaultDemo(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to demo model
  const resetToDemo = () => {
    setShowDefaultDemo(true);
    setArtwork(null);
    setArtworkImagePath(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Search UI */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search artwork (e.g., 'flowers', 'landscape')"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchAndPrepareArtwork}
            disabled={isLoading}
          >
            <Text style={styles.searchButtonText}>{isLoading ? 'Searching...' : 'Search'}</Text>
          </TouchableOpacity>
        </View>

        {/* Artwork Info */}
        {artwork && (
          <View style={styles.artworkInfo}>
            <Text style={styles.artworkTitle}>{artwork.title}</Text>
            <Text style={styles.artworkArtist}>By {artwork.artist || 'Unknown Artist'}</Text>
            <Text style={styles.artworkDate}>{artwork.date}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetToDemo}>
              <Text style={styles.resetButtonText}>Return to Demo Model</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AR Viewer */}
        <View style={styles.viewer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Preparing artwork for AR...</Text>
            </View>
          ) : demoModel ? (
            <ArViewerView
              style={StyleSheet.absoluteFillObject}
              model={demoModel}
              lightEstimation
              manageDepth
              allowRotate
              allowScale
              allowTranslate
              onStarted={() => console.log('AR started')}
              onEnded={() => console.log('AR ended')}
              onModelPlaced={() => console.log('Model placed')}
              onModelRemoved={() => console.log('Model removed')}
              planeOrientation={Platform.OS === 'ios' ? 'horizontal' : 'both'}
              imageAnchor={artworkImagePath && !showDefaultDemo ? artworkImagePath : undefined}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Preparing AR...</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.voiceBar}>
        <VoiceAgent />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  artworkInfo: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  artworkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  artworkArtist: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  artworkDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewer: {
    flex: 1,
  },
  voiceBar: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
  },
});

export default App;