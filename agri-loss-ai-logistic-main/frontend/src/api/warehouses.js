import apiClient from './client';

export const warehousesApi = {
  listWarehouses: () => apiClient.get('/api/warehouses/'),
  getWarehouse: (id) => apiClient.get(`/api/warehouses/${id}`),
  updateWarehouse: (id, payload) => apiClient.put(`/api/warehouses/${id}`, payload),
  inspectArrival: (warehouseId, payload) => apiClient.post(`/api/warehouses/${warehouseId}/inspect`, payload),
  dispatchShipment: (warehouseId, shipmentId, action = 'mandi', vehicleRegNo = null) => {
    const params = { shipment_id: shipmentId, action };
    if (vehicleRegNo) params.vehicle_reg_no = vehicleRegNo;
    return apiClient.post(`/api/warehouses/${warehouseId}/dispatch`, null, { params });
  },
};

export default warehousesApi;
