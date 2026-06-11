import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { apiReady, loadToken } from './src/api';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { SuppliersScreen } from './src/screens/SuppliersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SupplierDetailScreen } from './src/screens/SupplierDetailScreen';
import { ProcessingScreen } from './src/screens/ProcessingScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { SplitSummaryScreen } from './src/screens/SplitSummaryScreen';
import { UpgradeScreen } from './src/screens/UpgradeScreen';
import { RecurringScreen } from './src/screens/RecurringScreen';
import { BudgetsScreen } from './src/screens/BudgetsScreen';
import { QrScanScreen } from './src/screens/QrScanScreen';
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
  Perfil: 'person-circle',
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
      <Tab.Screen name="Inicio" component={DashboardScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Despesas" component={ExpensesScreen} options={{ title: 'Despesas' }} />
      <Tab.Screen name="Entidades" component={SuppliersScreen} options={{ title: 'Entidades' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      void NavigationBar.setBackgroundColorAsync('#00000000').catch(() => {});
      void NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      void NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    }
    apiReady
      .then(() => loadToken())
      .then((t) => setHasToken(!!t))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={hasToken ? 'Tabs' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Processing" component={ProcessingScreen} options={{ title: 'A processar', headerBackVisible: false }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Rever fatura' }} />
        <Stack.Screen name="SupplierDetail" component={SupplierDetailScreen} options={{ title: 'Fornecedor' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Relatório' }} />
        <Stack.Screen name="SplitSummary" component={SplitSummaryScreen} options={{ title: 'Dividir conta' }} />
        <Stack.Screen name="Upgrade" component={UpgradeScreen} options={{ title: 'Planos' }} />
        <Stack.Screen name="Recurring" component={RecurringScreen} options={{ title: 'Despesas recorrentes' }} />
        <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ title: 'Orçamentos' }} />
        <Stack.Screen name="QrScan" component={QrScanScreen} options={{ title: 'QR Code' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
