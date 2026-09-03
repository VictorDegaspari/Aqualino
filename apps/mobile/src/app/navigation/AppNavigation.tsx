import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {tokens} from '@aqualino/design-tokens';
import {useSessionStore} from '../../features/auth/application/sessionStore';
import {LoginScreen} from '../../features/auth/presentation/LoginScreen';
import {RegisterScreen} from '../../features/auth/presentation/RegisterScreen';
import {OnboardingScreen} from '../../features/onboarding/presentation/OnboardingScreen';
import {HomeScreen} from '../../features/home/presentation/HomeScreen';
import {QuickHydrationScreen} from '../../features/hydration/presentation/QuickHydrationScreen';
import {InventoryScreen} from '../../features/inventory/presentation/InventoryScreen';
import {linking} from './linking';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Home: undefined;
  Inventory: undefined;
  QuickHydration: {source?: string} | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigation(): React.JSX.Element {
  const {status, user, bootstrap} = useSessionStore();

  useEffect(() => { bootstrap().catch(() => undefined); }, [bootstrap]);

  if (status === 'booting') {
    return (
      <View style={styles.loader} accessibilityLabel="Carregando Aqualino">
        <ActivityIndicator size="large" color={tokens.color.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{headerShadowVisible: false}}>
        {status === 'signedOut' ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{title: 'Criar conta'}} />
          </>
        ) : !user?.profile.onboarding_completed_at ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{headerShown: false}} />
            <Stack.Screen name="Inventory" component={InventoryScreen} options={{title: 'Inventário'}} />
            <Stack.Screen name="QuickHydration" component={QuickHydrationScreen}
              options={{presentation: 'modal', title: 'Registro rápido'}} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({loader: {flex: 1, alignItems: 'center', justifyContent: 'center'}});
