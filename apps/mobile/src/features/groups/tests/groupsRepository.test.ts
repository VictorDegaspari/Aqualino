import {groupsRepository} from '../data/groupsRepository';
import {API_BASE_URL} from '../../../shared/config/environment';

jest.mock('../../../shared/security/secureTokenStore', () => ({secureTokenStore: {getCached: () => 'test-token'}}));

const originalFetch = globalThis.fetch;
afterEach(() => {globalThis.fetch = originalFetch;});

test('uses the configured API version and sends explicit consent only on acceptance', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ok: true, json: async () => ({data: null})});
  globalThis.fetch = fetchMock;
  await groupsRepository.current();
  await groupsRepository.create('Maré de amigos');
  await groupsRepository.preview('ABC123DEF456');
  await groupsRepository.accept('ABC123DEF456');
  await groupsRepository.renewInvite();
  await groupsRepository.leave();

  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    `${API_BASE_URL}/groups/current`, `${API_BASE_URL}/groups`, `${API_BASE_URL}/groups/invites/preview`,
    `${API_BASE_URL}/groups/invites/accept`, `${API_BASE_URL}/groups/current/invite`, `${API_BASE_URL}/groups/current/membership`,
  ]);
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({code: 'ABC123DEF456'});
  expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({code: 'ABC123DEF456', accept: true});
  expect(fetchMock.mock.calls[5][1].method).toBe('DELETE');
  expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer test-token');
});
