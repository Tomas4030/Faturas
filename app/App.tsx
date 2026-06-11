import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { SuppliersScreen } from './src/screens/SuppliersScreen';
import { SupplierDetailScreen } from './src/screens/SupplierDetailScreen';
import { ProcessingScreen } from './src/screens/ProcessingScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { SplitSummaryScreen } from './src/screens/SplitSummaryScreen';
import { colors } from './src/theme';
import type { RootStackParamList, TabsParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabsParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

const TAB_ICONS: Record<keyof TabsParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home',
  Despesas: 'receipt',
  Entidades: 'people',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{ title: 'Início' }}
      />
      <Tab.Screen
        name="Despesas"
        component={ExpensesScreen}
        options={{ title: 'Despesas' }}
      />
      <Tab.Screen
        name="Entidades"
        component={SuppliersScreen}
        options={{ title: 'Entidades' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      void NavigationBar.setBackgroundColorAsync('#00000000');
      void NavigationBar.setVisibilityAsync('hidden');
      void NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Processing"
          component={ProcessingScreen}
          options={{ title: 'A processar', headerBackVisible: false }}
        />
        <Stack.Screen
          name="Review"
          component={ReviewScreen}
          options={{ title: 'Rever fatura' }}
        />
        <Stack.Screen
          name="SupplierDetail"
          component={SupplierDetailScreen}
          options={{ title: 'Fornecedor' }}
        />
        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{ title: 'Relatório' }}
        />
        <Stack.Screen
          name="SplitSummary"
          component={SplitSummaryScreen}
          options={{ title: 'Dividir conta' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
