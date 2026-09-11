import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer, StackActions, useNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppLoadingScreen} from '../presentation/AppLoadingScreen';
import {useSessionStore} from '../../features/auth/application/sessionStore';
import {requiresEmailVerification} from '../../features/auth/application/emailVerification';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import {ChallengeBottomNavigation, type ChallengeBottomTab} from '../../features/home/presentation/challenge/ChallengeBottomNavigation';
import {linking} from './linking';
import {appNavigationTheme, tabScreenOptions} from './tabNavigation';

export type RootStackParamList = {
  Welcome: undefined;
  SignIn: {email?: string} | undefined;
  ForgotPassword: {email?: string} | undefined;
  ResetPassword: {email?: string; token?: string; locale?: string} | undefined;
  VerifyEmail: undefined;
  Onboarding: undefined;
  Home: {recordedAmountMl?: number} | undefined;
  Groups: undefined;
  Reminders: undefined;
  Inventory: undefined;
  History: undefined;
  Profile: undefined;
  Achievements: undefined;
  Friends: undefined;
  AddFriends: undefined;
  PersonProfile: {userId: string};
  QuickHydration: {source?: string; photoUri?: string; photoBase64?: string} | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const getWelcomeScreen = () => require('../../features/onboarding/presentation/WelcomeScreen').WelcomeScreen;
const getOnboardingScreen = () => require('../../features/onboarding/presentation/OnboardingScreen').OnboardingScreen;
const getHomeScreen = () => require('./HomeRoute').HomeRoute;
const getGroupsScreen = () => require('../../features/groups/presentation/GroupsScreen').GroupsScreen;
const getRemindersScreen = () => require('../../features/reminders/presentation/RemindersScreen').RemindersScreen;
const getInventoryScreen = () => require('../../features/inventory/presentation/InventoryScreen').InventoryScreen;
const getHistoryScreen = () => require('../../features/hydration/presentation/HydrationHistoryScreen').HydrationHistoryScreen;
const getProfileScreen = () => require('../../features/profile/presentation/ProfileScreen').ProfileScreen;
const getFriendsScreen = () => require('../../features/friends/presentation/FriendsScreen').FriendsScreen;
const getPersonProfileScreen = () => require('../../features/friends/presentation/PersonProfileScreen').PersonProfileScreen;
const getAchievementsScreen = () => require('../../features/achievements/presentation/AchievementsScreen').AchievementsScreen;
const getQuickHydrationRoute = () => require('./QuickHydrationRoute').QuickHydrationRoute;
const getSignInScreen = () => require('../../features/auth/presentation/SignInScreen').SignInScreen;
const getForgotPasswordScreen = () => require('../../features/auth/presentation/ForgotPasswordScreen').ForgotPasswordScreen;
const getResetPasswordScreen = () => require('../../features/auth/presentation/ResetPasswordScreen').ResetPasswordScreen;
const getVerifyEmailScreen = () => require('../../features/auth/presentation/VerifyEmailScreen').VerifyEmailScreen;

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
  const verificationRequired = requiresEmailVerification(user);
  const showBottomNavigation = status === 'signedIn' && !verificationRequired && Boolean(user?.profile.onboarding_completed_at) && Boolean(activeTab);
  const sessionNavigationKey = status === 'signedOut'
    ? 'signed-out'
    : verificationRequired ? `verify:${user?.id}` : user?.profile.onboarding_completed_at
      ? `signed-in:${user.id}`
      : 'onboarding';
  const openTab = (route: TabRouteName) => {
    if (!navigationRef.isReady() || navigationRef.getCurrentRoute()?.name === route) {
      return;
    }

    // Reordering retained native-stack screens can leave their surfaces blank on Android.
    navigationRef.dispatch(StackActions.replace(route));
  };

  return (
    <View testID={`screen-${activeRoute ?? 'loading'}`} collapsable={false} style={styles.root}>
      <NavigationContainer
        theme={appNavigationTheme}
        linking={linking}
        ref={navigationRef}
        onReady={() => setActiveRoute(navigationRef.getCurrentRoute()?.name)}
        onStateChange={() => setActiveRoute(navigationRef.getCurrentRoute()?.name)}>
        <Stack.Navigator screenOptions={{headerShadowVisible: false}}>
          <Stack.Group navigationKey={sessionNavigationKey}>
            {status === 'signedOut' ? (
              <Stack.Screen name="Welcome" getComponent={getWelcomeScreen} options={{headerShown: false}} />
            ) : verificationRequired ? (
              <Stack.Screen name="VerifyEmail" getComponent={getVerifyEmailScreen} options={{headerShown: false}} />
            ) : !user?.profile.onboarding_completed_at ? (
              <Stack.Screen name="Onboarding" getComponent={getOnboardingScreen} options={{headerShown: false}} />
            ) : (
              <>
                <Stack.Screen name="Home" getComponent={getHomeScreen} options={tabScreenOptions} />
                <Stack.Screen name="Groups" getComponent={getGroupsScreen} options={tabScreenOptions} />
                <Stack.Screen name="Reminders" getComponent={getRemindersScreen} options={tabScreenOptions} />
                <Stack.Screen name="Inventory" getComponent={getInventoryScreen} options={{
                  headerShown: false, presentation: 'transparentModal', animation: 'none', gestureEnabled: false,
                  contentStyle: {backgroundColor: 'transparent'},
                }} />
                <Stack.Screen name="History" getComponent={getHistoryScreen} options={tabScreenOptions} />
                <Stack.Screen name="Friends" getComponent={getFriendsScreen} options={{headerShown: false, presentation: 'transparentModal', animation: 'none', gestureEnabled: false, contentStyle: {backgroundColor: 'transparent'}}} />
                <Stack.Screen name="AddFriends" getComponent={getFriendsScreen} options={{headerShown: false, presentation: 'transparentModal', animation: 'none', gestureEnabled: false, contentStyle: {backgroundColor: 'transparent'}}} />
                <Stack.Screen name="PersonProfile" getComponent={getPersonProfileScreen} options={{headerShown: false, presentation: 'transparentModal', animation: 'none', gestureEnabled: false, contentStyle: {backgroundColor: 'transparent'}}} />
                <Stack.Screen name="Profile" getComponent={getProfileScreen} options={tabScreenOptions} />
                <Stack.Screen name="Achievements" getComponent={getAchievementsScreen} options={{
                  headerShown: false, presentation: 'transparentModal', animation: 'none', gestureEnabled: false,
                  contentStyle: {backgroundColor: 'transparent'},
                }} />
              </>
            )}
            <Stack.Screen name="QuickHydration" getComponent={getQuickHydrationRoute}
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                headerShown: false,
                contentStyle: {backgroundColor: 'transparent'},
              }} />
          </Stack.Group>
          <Stack.Group screenOptions={{headerShown: false, contentStyle: {backgroundColor: challengeTheme.colors.background}}}>
            <Stack.Screen name="ForgotPassword" getComponent={getForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" getComponent={getResetPasswordScreen} />
            <Stack.Screen name="SignIn" getComponent={getSignInScreen} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
      {showBottomNavigation && activeTab ? (
        <ChallengeBottomNavigation
          activeTab={activeTab}
          onOpenHome={() => openTab('Home')}
          onOpenGroup={() => openTab('Groups')}
          onOpenReminders={() => openTab('Reminders')}
          onOpenHistory={() => openTab('History')}
          onOpenProfile={() => openTab('Profile')}
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

const styles = StyleSheet.create({root: {flex: 1, backgroundColor: challengeTheme.colors.background}});
