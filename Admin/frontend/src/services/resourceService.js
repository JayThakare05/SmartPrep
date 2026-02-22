import axios from "axios";

const API = "http://localhost:5000/api/resources";

export const getResources = () => axios.get(API);
export const uploadResource = (formData) =>
  axios.post(API, formData);

export const deleteResource = (id) =>
  axios.delete(`${API}/${id}`);

export const updateResource = (id, formData) =>
  axios.put(`${API}/${id}`, formData);