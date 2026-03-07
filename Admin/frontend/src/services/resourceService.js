import axios from "axios";

const API = "http://localhost:5000/api/resources";

// All browse/filter calls carry examType as a query param
export const getResources  = (params = {}) => axios.get(API, { params });
export const uploadResource  = (formData)    => axios.post(API, formData);
export const deleteResource  = (id)          => axios.delete(`${API}/${id}`);
export const updateResource  = (id, formData)=> axios.put(`${API}/${id}`, formData);

// Meta — all carry examType in query or body
export const getSubjects   = (examType)              => axios.get(`${API}/meta/subjects`,   { params: { examType } });
export const getSubfolders = (examType, subject)     => axios.get(`${API}/meta/subfolders`, { params: { examType, subject } });
export const createSubject = (examType, subject)     => axios.post(`${API}/meta/subjects`,  { examType, subject });
export const createSubfolder = (examType, subject, subFolder) =>
  axios.post(`${API}/meta/subfolders`, { examType, subject, subFolder });
export const deleteSubject = (examType, subject)     =>
  axios.delete(`${API}/meta/subjects`,   { params: { examType, subject } });
export const deleteSubfolder = (examType, subject, subFolder) =>
  axios.delete(`${API}/meta/subfolders`, { params: { examType, subject, subFolder } });