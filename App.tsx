import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StatusBar, StyleSheet, useColorScheme, View, PermissionsAndroid, Text } from 'react-native';
import { ArViewerView } from 'react-native-ar-viewer';
import RNFS from 'react-native-fs';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [iosModelPath, setIosModelPath] = useState<string | null>(null);
  const demoModel = useMemo(
    () => (Platform.OS === 'android'
      ? 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb'
      : iosModelPath ?? ''),
    [iosModelPath]
  );

  useEffect(() => {
    // Android: request camera permission at runtime
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      return;
    }

    // iOS: download a sample USDZ locally for ARKit
    const download = async () => {
      try {
        // Use a stable Apple sample. The toy_biplane URL returns 404 now.
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
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.viewer}>
        {demoModel ? (
          <ArViewerView
            style={StyleSheet.absoluteFillObject}
            model={demoModel}
            lightEstimation
            manageDepth
            allowRotate
            allowScale
            allowTranslate
            planeOrientation="both"
            onStarted={() => console.log('AR started')}
            onEnded={() => console.log('AR ended')}
            onModelPlaced={() => console.log('AR model placed')}
            onModelRemoved={() => console.log('AR model removed')}
          />
        ) : (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Preparing AR…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});

export default App;
