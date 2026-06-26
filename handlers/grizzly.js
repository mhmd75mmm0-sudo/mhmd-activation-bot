// handlers/grizzly.js
// التعامل مع GrizzlySMS API

import config from '../config.js';

const GRIZZLY_BASE = config.GRIZZLY_BASE_URL;
const API_KEY = () => config.GRIZZLY_API_KEY;

async function grizzlyRequest(action, params = {}) {
  const url = new URL(GRIZZLY_BASE);
  url.searchParams.set('api_key', API_KEY());
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString());
  const text = await response.text();

  // محاولة تحويل JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

export async function getBalance() {
  const response = await grizzlyRequest('getBalance');
  if (typeof response === 'string' && response.startsWith('ACCESS_BALANCE:')) {
    return parseFloat(response.split(':')[1]);
  }
  return null;
}

export async function getNumber(service, country, maxPrice = null, providerIds = null, exceptProviderIds = null) {
  return grizzlyRequest('getNumber', { service, country, maxPrice, providerIds, exceptProviderIds });
}

export async function getNumberV2(service, country, maxPrice = null, providerIds = null, exceptProviderIds = null) {
  const response = await grizzlyRequest('getNumberV2', { service, country, maxPrice, providerIds, exceptProviderIds });
  if (typeof response === 'string') return null;
  return response;
}

export async function setStatus(id, status) {
  return grizzlyRequest('setStatus', { id, status });
}

export async function getStatus(id) {
  return grizzlyRequest('getStatus', { id });
}

export async function getStatusV2(id) {
  const response = await grizzlyRequest('getStatusV2', { id });
  if (typeof response === 'string') return null;
  return response;
}

export async function getPrices(service, country) {
  const response = await grizzlyRequest('getPrices', { service, country });
  if (typeof response === 'string') return null;
  return response;
}

export async function getPricesV2(service, country) {
  const response = await grizzlyRequest('getPricesV2', { service, country });
  if (typeof response === 'string') return null;
  return response;
}

export async function getPricesV3(service, country) {
  const response = await grizzlyRequest('getPricesV3', { service, country });
  if (typeof response === 'string') return null;
  return response;
}

export async function getActiveActivations() {
  const response = await grizzlyRequest('getActiveActivations');
  if (typeof response === 'string') return null;
  return response;
}

export async function getCountries() {
  const response = await grizzlyRequest('getCountries');
  if (typeof response === 'string') return null;
  return response;
}

export async function getServicesList() {
  const response = await grizzlyRequest('getServicesList');
  if (typeof response === 'string') return null;
  return response;
}
