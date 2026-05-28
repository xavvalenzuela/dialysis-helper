import { View, Text, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, ZoomIn, ZoomOut } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { File as FsFile } from 'expo-file-system';
import Pdf from 'react-native-pdf';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];
const TEXT_EXTENSIONS = ['txt'];

function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export default function DocViewer() {
  const { uri, name } = useLocalSearchParams<{ uri: string; name: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const { width, height } = Dimensions.get('window');
  const ext = getExtension(name ?? '');
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  const isText = TEXT_EXTENSIONS.includes(ext);
  const isPdf = !isImage && !isText;

  useEffect(() => {
    if (!isText || !uri) return;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 15_000),
    );
    Promise.race([new FsFile(uri).text(), timeout])
      .then(content => { setTextContent(content); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [uri, isText]);

  const zoomOut = () => setScale(s => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))));
  const zoomIn  = () => setScale(s => Math.min(4.0, parseFloat((s + 0.25).toFixed(2))));

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b-2 border-slate-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" accessibilityLabel="Go back">
          <ChevronLeft size={24} color="#e2e8f0" />
        </TouchableOpacity>
        <Text className="text-slate-100 font-semibold flex-1" numberOfLines={1}>
          {name}
        </Text>
      </View>

      {/* Zoom controls — PDF only */}
      {isPdf && !error && (
        <View className="flex-row items-center justify-center py-2 border-b-2 border-slate-700" style={{ gap: 28 }}>
          <TouchableOpacity onPress={zoomOut} className="p-2" accessibilityLabel="Zoom out">
            <ZoomOut size={20} color={scale <= 0.5 ? '#475569' : '#94a3b8'} />
          </TouchableOpacity>
          <Text className="text-slate-400 text-sm w-12 text-center">
            {Math.round(scale * 100)}%
          </Text>
          <TouchableOpacity onPress={zoomIn} className="p-2" accessibilityLabel="Zoom in">
            <ZoomIn size={20} color={scale >= 4.0 ? '#475569' : '#94a3b8'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Viewer */}
      <View className="flex-1">
        {loading && !error && (
          <View className="absolute inset-0 items-center justify-center" style={{ zIndex: 10 }}>
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        )}

        {error && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-slate-400 text-center">
              Could not load this file. Try opening it with another app.
            </Text>
          </View>
        )}

        {!error && isText && textContent !== null && (
          <ScrollView className="flex-1 p-5">
            <Text style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 22, fontFamily: 'monospace' }}>
              {textContent}
            </Text>
          </ScrollView>
        )}

        {!error && isImage && (
          <Image
            source={{ uri }}
            style={{ width, height: height - 120 }}
            resizeMode="contain"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        )}

        {!error && isPdf && (
          <Pdf
            source={{ uri, cache: true }}
            style={{ flex: 1, width }}
            scale={scale}
            minScale={0.5}
            maxScale={4.0}
            onLoadComplete={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            enablePaging
            horizontal={false}
            trustAllCerts={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
