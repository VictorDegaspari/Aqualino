import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer, StackActions, useNavigationContainerRef} from '@react-navigation/native';
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
  const sessionNavigationKey = status === 'signedOut'
    ? 'signed-out'
    : user?.profile.onboarding_completed_at
      ? 'signed-in'
      : 'onboarding';
  const replaceTab = (route: TabRouteName) => {
    if (!navigationRef.isReady() || navigationRef.getCurrentRoute()?.name === route) {
      return;
    }

    navigationRef.dispatch(StackActions.replace(route));
  };

  return (
    <View style={styles.root}>
      <NavigationContainer
        linking={linking}
        ref={navigationRef}
        onReady={() => setActiveRoute(navigationRef.getCurrentRoute()?.name)}
        onStateChange={() => setActiveRoute(navigationRef.getCurrentRoute()?.name)}>
        <Stack.Navigator screenOptions={{headerShadowVisible: false}}>
          <Stack.Group navigationKey={sessionNavigationKey}>
            {status === 'signedOut' ? (
              <Stack.Screen name="Welcome" getComponent={getWelcomeScreen} options={{headerShown: false}} />
            ) : !user?.profile.onboarding_completed_at ? (
              <Stack.Screen name="Onboarding" getComponent={getOnboardingScreen} options={{headerShown: false}} />
            ) : (
              <>
                <Stack.Screen name="Home" getComponent={getHomeScreen} options={tabScreenOptions} />
                <Stack.Screen name="Groups" getComponent={getGroupsScreen} options={tabScreenOptions} />
                <Stack.Screen name="Reminders" getComponent={getRemindersScreen} options={tabScreenOptions} />
                <Stack.Screen name="Inventory" getComponent={getInventoryScreen} options={{
                  title: 'Inventário',
                  headerStyle: {backgroundColor: challengeTheme.colors.background},
                  headerTintColor: challengeTheme.colors.text,
                  headerTitleStyle: {fontWeight: '900'},
                  contentStyle: {backgroundColor: challengeTheme.colors.background},
                }} />
                <Stack.Screen name="History" getComponent={getHistoryScreen} options={tabScreenOptions} />
                <Stack.Screen name="Profile" getComponent={getProfileScreen} options={tabScreenOptions} />
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
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
      {showBottomNavigation && activeTab ? (
        <ChallengeBottomNavigation
          activeTab={activeTab}
          onOpenHome={() => replaceTab('Home')}
          onOpenGroup={() => replaceTab('Groups')}
          onOpenReminders={() => replaceTab('Reminders')}
          onOpenHistory={() => replaceTab('History')}
          onOpenProfile={() => replaceTab('Profile')}
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

type TabRouteName = 'Home' | 'Groups' | 'Reminders' | 'History' | 'Profile';

const tabScreenOptions = {headerShown: false, animation: 'none'} as const;

const styles = StyleSheet.create({root: {flex: 1}});
