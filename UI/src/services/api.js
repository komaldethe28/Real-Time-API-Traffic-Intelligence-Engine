import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

export const fetchOverview = async () => {
  const { data } = await api.get("/api/v1/analytics/overview");
  return data;
};

export const fetchFlags = async () => {
  const { data } = await api.get("/api/v1/analytics/flags");
  return data;
};

export const fetchIp = async (ip) => {
  const { data } = await api.get(`/api/v1/analytics/ip/${encodeURIComponent(ip)}`);
  return data;
};
