import { Tabs } from 'expo-router';
import { Calendar, Droplets, Scale, Heart, FileText, FolderOpen } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#bae6fd' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fluid"
        options={{
          title: 'Fluid',
          tabBarIcon: ({ color }) => <Droplets size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: 'Weight',
          tabBarIcon: ({ color }) => <Scale size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="blood-pressure"
        options={{
          title: 'BP',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="symptoms"
        options={{
          title: 'Symptoms',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Docs',
          tabBarIcon: ({ color }) => <FolderOpen size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
