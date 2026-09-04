import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppLoadingScreen} from '../presentation/AppLoadingScreen';
import {useSessionStore} from '../../features/auth/application/sessionStore';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import {ChallengeBottomNavigation, type ChallengeBottomTab} from '../../features/home/presentation/challenge/ChallengeBottomNavigation';
import {linking} from './linking';

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Home: undefined;
  Groups: undefined;
  Reminders: undefined;
  Inventory: undefined;
  History: undefined;
  Profile: undefined;
  QuickHydration: {source?: string; photoUri?: string} | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const getWelcomeScreen = () => require('../../features/onboarding/presentation/WelcomeScreen').WelcomeScreen;
const getOnboardingScreen = () => require('../../features/onboarding/presentation/OnboardingScreen').OnboardingScreen;
const getHomeScreen = () => require('../../features/home/presentation/HomeScreen').HomeScreen;
const getGroupsScreen = () => require('../../features/groups/presentation/GroupsScreen').GroupsScreen;
const getRemindersScreen = () => require('../../features/reminders/presentation/RemindersScreen').RemindersScreen;
const getInventoryScreen = () => require('../../features/inventory/presentation/InventoryScreen').InventoryScreen;
const getHistoryScreen = () => require('../../features/hydration/presentation/HydrationHistoryScreen').HydrationHistoryScreen;
const getProfileScreen = () => require('../../features/profile/presentation/ProfileScreen').ProfileScreen;
const getQuickHydrationRoute = () => require('./QuickHydrationRoute').QuickHydrationRoute;

export function AppNavigation(): React.JSX.Element {
  const status = useSessionStore(state => state.status);
  const user = useSessionStore(state => state.user);
  const bootstrap = useSessionStore(state => state.bootstrap);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRoute, setActiveRoute] = useState<string>();

  useEffect(() => { bootstrap().catch(() => undefined); }, [bootstrap]);

  if (status === 'booting') {
    return <AppLoadingScreen />;
  }

  const activeTab = tabForRoute(activeRoute);
  const showBottomNavigation = status === 'signedIn' && Boolean(user?.profile.onboarding_completed_at) && Boolean(activeTab);

  return (
    <View style={styles.root}>
      <NavigationContainer
        linking={linking}
        ref={navigationRef}
        onReady={() => setActiveRoute(navigationRef.getCurrentRoute()?.name)}
        onStateChange={() => setActiveRoute(navigationRef.getCurrentRoute()?.name)}>
        <Stack.Navigator screenOptions={{headerShadowVisible: false}}>
        {status === 'signedOut' ? (
          <Stack.Screen name="Welcome" getComponent={getWelcomeScreen} options={{headerShown: false}} />
        ) : !user?.profile.onboarding_completed_at ? (
          <Stack.Screen name="Onboarding" getComponent={getOnboardingScreen} options={{headerShown: false}} />
        ) : (
          <>
            <Stack.Screen name="Home" getComponent={getHomeScreen} options={{headerShown: false}} />
            <Stack.Screen name="Groups" getComponent={getGroupsScreen} options={{headerShown: false}} />
            <Stack.Screen name="Reminders" getComponent={getRemindersScreen} options={{headerShown: false}} />
            <Stack.Screen name="Inventory" getComponent={getInventoryScreen} options={{
              title: 'Inventário',
              headerStyle: {backgroundColor: challengeTheme.colors.background},
              headerTintColor: challengeTheme.colors.text,
              headerTitleStyle: {fontWeight: '900'},
              contentStyle: {backgroundColor: challengeTheme.colors.background},
            }} />
            <Stack.Screen
              name="History"
              getComponent={getHistoryScreen}
              options={{
                title: 'Histórico',
                headerStyle: {backgroundColor: challengeTheme.colors.background},
                headerTintColor: challengeTheme.colors.text,
                headerTitleStyle: {fontWeight: '900'},
                contentStyle: {backgroundColor: challengeTheme.colors.background},
              }}
            />
            <Stack.Screen name="Profile" getComponent={getProfileScreen} options={{
              title: 'Perfil',
              headerStyle: {backgroundColor: challengeTheme.colors.background},
              headerTintColor: challengeTheme.colors.text,
              headerTitleStyle: {fontWeight: '900'},
              contentStyle: {backgroundColor: challengeTheme.colors.background},
            }} />
          </>
        )}
          <Stack.Screen name="QuickHydration" getComponent={getQuickHydrationRoute}
            options={{
              presentation: 'modal',
              title: 'Bebi água',
              headerStyle: {backgroundColor: challengeTheme.colors.background},
              headerTintColor: challengeTheme.colors.text,
              headerTitleStyle: {fontWeight: '900'},
              contentStyle: {backgroundColor: challengeTheme.colors.background},
            }} />
        </Stack.Navigator>
      </NavigationContainer>
      {showBottomNavigation && activeTab ? (
        <ChallengeBottomNavigation
          activeTab={activeTab}
          onOpenHome={() => navigationRef.navigate('Home')}
          onOpenGroup={() => navigationRef.navigate('Groups')}
          onOpenReminders={() => navigationRef.navigate('Reminders')}
          onOpenHistory={() => navigationRef.navigate('History')}
          onOpenProfile={() => navigationRef.navigate('Profile')}
        />
      ) : null}
    </View>
  );
}

function tabForRoute(route?: string): ChallengeBottomTab | undefined {
  return route === 'Home'
    ? 'home'
    : route === 'Groups'
      ? 'group'
      : route === 'Reminders'
        ? 'reminders'
        : route === 'History'
          ? 'history'
          : route === 'Profile'
            ? 'profile'
            : undefined;
}

const styles = StyleSheet.create({root: {flex: 1}});
