import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
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
import type { RootStackParamList, TabsParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabsParamList>();

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
        tabBarActiveTintColor: '#1a73e8',
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
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
