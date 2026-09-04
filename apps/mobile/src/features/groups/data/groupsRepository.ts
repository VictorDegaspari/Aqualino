import type {GroupInvitePreview, PrivateGroup} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

const requestOptions = {timeoutMs: 15_000};

export const groupsRepository = {
  current(signal?: AbortSignal): Promise<PrivateGroup | null> {
    return apiRequest('/groups/current', {...requestOptions, signal});
  },
  create(name: string): Promise<PrivateGroup> {
    return apiRequest('/groups', {...requestOptions, method: 'POST', body: {name}});
  },
  preview(code: string): Promise<GroupInvitePreview> {
    return apiRequest('/groups/invites/preview', {...requestOptions, method: 'POST', body: {code}});
  },
  accept(code: string): Promise<PrivateGroup> {
    return apiRequest('/groups/invites/accept', {...requestOptions, method: 'POST', body: {code, accept: true}});
  },
  renewInvite(): Promise<PrivateGroup> {
    return apiRequest('/groups/current/invite', {...requestOptions, method: 'POST'});
  },
  leave(): Promise<null> {
    return apiRequest('/groups/current/membership', {...requestOptions, method: 'DELETE'});
  },
};
