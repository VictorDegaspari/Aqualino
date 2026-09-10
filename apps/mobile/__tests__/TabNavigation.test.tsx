import {CommonActions, StackActions, StackRouter, type ParamListBase, type StackNavigationState} from '@react-navigation/routers';

const tabs = ['Home', 'Groups', 'Reminders', 'History', 'Profile'];
const config = {
  routeNames: [...tabs, 'QuickHydration', 'Friends'],
  routeParamList: {},
  routeGetIdList: {},
};

function applyAction(router: ReturnType<typeof StackRouter>, state: StackNavigationState<ParamListBase>, action: Parameters<ReturnType<typeof StackRouter>['getStateForAction']>[1]) {
  const next = router.getStateForAction(state, action, config);
  expect(next).not.toBeNull();
  return router.getRehydratedState(next!, config);
}

test('keeps only the current native tab during repeated switches', () => {
  const router = StackRouter({initialRouteName: 'Home'});
  let state = router.getInitialState(config);
  const discardedKeys = new Set<string>();

  for (let cycle = 0; cycle < 10; cycle++) {
    for (const name of tabs) {
      if (state.routes[state.index].name === name) continue;
      discardedKeys.add(state.routes[state.index].key);
      state = applyAction(router, state, StackActions.replace(name));
      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe(name);
      expect(discardedKeys.has(state.routes[0].key)).toBe(false);
    }
  }
  // Switching tabs must not turn Android Back into a tour of old tabs.
  expect(router.getStateForAction(state, CommonActions.goBack(), config)).toBeNull();
});

test('returns from overlays to the same tab and delivers the hydration confirmation', () => {
  const router = StackRouter({initialRouteName: 'Home'});
  let state = router.getInitialState(config);
  state = applyAction(router, state, StackActions.replace('Groups'));
  const groupsKey = state.routes[state.index].key;
  state = applyAction(router, state, CommonActions.navigate('Friends'));
  state = applyAction(router, state, CommonActions.goBack());
  expect(state.routes[state.index].key).toBe(groupsKey);
  state = applyAction(router, state, StackActions.replace('Home'));
  const homeKey = state.routes[0].key;
  state = applyAction(router, state, CommonActions.navigate('QuickHydration'));
  state = applyAction(router, state, StackActions.popTo('Home', {recordedAmountMl: 250}));
  expect(state.routes[state.index]).toMatchObject({key: homeKey, params: {recordedAmountMl: 250}});
  expect(state.routes).toHaveLength(1);
});

test('discards the current tab when the signed-in routes are removed', () => {
  const router = StackRouter({initialRouteName: 'Home'});
  let state = router.getInitialState(config);
  state = applyAction(router, state, StackActions.replace('Profile'));
  state = router.getStateForRouteNamesChange(state, {
    routeNames: ['Welcome'], routeParamList: {}, routeGetIdList: {}, routeKeyChanges: tabs,
  });
  expect(state.routes.map(route => route.name)).toEqual(['Welcome']);
});
