
const PANTRY_BASE_URL = 'https://getpantry.cloud/apiv1/pantry';

export const cloudSync = {
  async saveBasket(pantryId: string, basketName: string, data: any) {
    if (!pantryId) return false;
    try {
      const response = await fetch(`${PANTRY_BASE_URL}/${pantryId}/basket/${basketName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch (error) {
      console.error(`Failed to push to ${basketName}:`, error);
      return false;
    }
  },

  async getBasket(pantryId: string, basketName: string) {
    if (!pantryId) return null;
    try {
      const response = await fetch(`${PANTRY_BASE_URL}/${pantryId}/basket/${basketName}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${basketName}:`, error);
      return null;
    }
  },

  async getPantryDetails(pantryId: string) {
    if (!pantryId) return null;
    try {
      const response = await fetch(`${PANTRY_BASE_URL}/${pantryId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }
};
