/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

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
    const controller = new AbortController();
    const download = async () => {
      try {
        const destPath = RNFS.CachesDirectoryPath + '/toy_biplane.usdz';
        // Small Apple sample usdz; if unavailable in future, replace with another public USDZ
        const url = 'https://developer.apple.com/augmented-reality/quick-look/models/toy_biplane/toy_biplane.usdz';
        if (await RNFS.exists(destPath)) {
          console.log('USDZ already cached at', destPath);
          setIosModelPath(destPath);
          return;
        }
        console.log('Downloading USDZ from', url);
        const res = await RNFS.downloadFile({ fromUrl: url, toFile: destPath }).promise;
        console.log('USDZ download status', res.statusCode, '->', destPath);
        if (res.statusCode === 200) {
          setIosModelPath(destPath);
        } else {
          console.log('USDZ download failed, status:', res.statusCode);
        }
      } catch (e) {
        console.log('USDZ download error', e);
      }
    };
    download();
    return () => controller.abort();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.viewer}>
        {demoModel ? (
          <ArViewerView
            style={StyleSheet.absoluteFill}
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
            onError={(e: any) => console.log('AR error', e)}
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
