import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext, addDatabaseChangeListener } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File as FsFile, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import { Plus, Trash2, File, Eye, Share2 } from 'lucide-react-native';
import { addDocument, deleteDocument } from '../../lib/data';
import { todayFormatted } from '../../lib/db';

type Doc = { id: number; name: string; type: string; uri: string; uploaded_at: string };
type DocType = 'prescription' | 'lab' | 'treatment' | 'other' | 'log';

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab', label: 'Lab Results' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'other', label: 'Other' },
  { value: 'log', label: 'Logs' },
];

export default function Documents() {
  const db = useSQLiteContext();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedType, setSelectedType] = useState<DocType>('prescription');

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<Doc>('SELECT * FROM documents ORDER BY uploaded_at DESC');
    setDocs(rows);
  }, [db]);

  useEffect(() => {
    load();
    const sub = addDatabaseChangeListener(load);
    return () => sub.remove();
  }, [load]);

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const fileName = `${Date.now()}_${asset.name}`;
    const destFile = new FsFile(Paths.document, fileName);

    try {
      const sourceFile = new FsFile(asset.uri);
      await sourceFile.copy(destFile);
      await addDocument(db, asset.name, selectedType, destFile.uri);
    } catch {
      Alert.alert('Error', 'Could not save the document. Please try again.');
    }
  };

  const handleView = (doc: Doc) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/doc-viewer' as any, params: { uri: doc.uri, name: doc.name } });
  };

  const handleShare = async (doc: Doc) => {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Not supported', 'Sharing is not available on this device.');
      return;
    }
    try {
      await Sharing.shareAsync(doc.uri, { dialogTitle: `Share ${doc.name}` });
    } catch {
      Alert.alert('Error', 'Could not share the document.');
    }
  };

  const handleDelete = (doc: Doc) => {
    Alert.alert('Delete document', `Remove "${doc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { new FsFile(doc.uri).delete(); } catch { /* already gone */ }
          await deleteDocument(db, doc.id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView>
        <View className="px-4 py-5">
          <Text className="text-2xl font-bold text-sky-700">Documents</Text>
          <Text className="text-slate-400 text-sm mt-0.5">{todayFormatted()}</Text>
        </View>

        <View className="mx-4 mb-4 p-4 bg-white rounded-2xl border border-sky-100">
          <Text className="text-slate-400 text-xs font-semibold uppercase mb-3">Upload as</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row mb-4" style={{ gap: 8 }}>
              {DOC_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  className={`px-4 py-2 rounded-full border ${
                    selectedType === t.value ? 'bg-sky-600 border-sky-600' : 'bg-white border-sky-100'
                  }`}
                  onPress={() => setSelectedType(t.value)}
                >
                  <Text className={selectedType === t.value ? 'text-white font-medium' : 'text-slate-600'}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            className="flex-row items-center justify-center border-2 border-dashed border-sky-200 bg-sky-50 rounded-xl py-5"
            onPress={handlePick}
          >
            <Plus size={20} color="#0284c7" />
            <Text className="text-sky-700 font-semibold ml-2">Upload Document</Text>
          </TouchableOpacity>
        </View>

        {docs.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-slate-400">No documents yet</Text>
          </View>
        ) : (
          DOC_TYPES.filter(t => docs.some(d => d.type === t.value)).map(t => (
            <View key={t.value} className="mx-4 mb-4 p-4 bg-white rounded-2xl border border-sky-100">
              <Text className="text-slate-400 text-xs font-semibold uppercase mb-2">{t.label}</Text>
              {docs.filter(d => d.type === t.value).map(doc => (
                <View key={doc.id} className="flex-row items-center py-3 border-b border-sky-50">
                  <File size={18} color="#94a3b8" />
                  <View className="flex-1 ml-3">
                    <Text className="text-slate-700 font-medium" numberOfLines={1}>{doc.name}</Text>
                    <Text className="text-slate-400 text-xs">{doc.uploaded_at.slice(0, 10)}</Text>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 16 }}>
                    <TouchableOpacity onPress={() => handleView(doc)}>
                      <Eye size={17} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleShare(doc)}>
                      <Share2 size={17} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(doc)}>
                      <Trash2 size={17} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
