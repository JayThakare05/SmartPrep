import { useEffect, useState } from "react";
import {
  getResources,
  uploadResource,
  deleteResource,
  updateResource,
} from "../services/resourceService";

export default function AdminResources() {
  const [resources, setResources] = useState([]);
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [subFolder, setSubFolder] = useState("");

  const fetchData = async () => {
    const res = await getResources();
    setResources(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);
    formData.append("subFolder", subFolder);

    await uploadResource(formData);
    fetchData();
  };

  const handleDelete = async (id) => {
    await deleteResource(id);
    fetchData();
  };

  const handleUpdate = async (id) => {
    const formData = new FormData();
    formData.append("file", file);
    await updateResource(id, formData);
    fetchData();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Resource Panel</h1>

      <div className="bg-white p-4 shadow rounded mb-6">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <input
          type="text"
          placeholder="Subject"
          className="border p-2 ml-2"
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          type="text"
          placeholder="Sub Folder"
          className="border p-2 ml-2"
          onChange={(e) => setSubFolder(e.target.value)}
        />
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white px-4 py-2 ml-2 rounded"
        >
          Upload
        </button>
      </div>

      <div className="grid gap-4">
        {resources.map((res) => (
          <div
            key={res._id}
            className="p-4 border rounded shadow flex justify-between"
          >
            <div>
              <h2 className="font-semibold">{res.title}</h2>
              <p className="text-sm text-gray-500">
                {res.subject} / {res.subFolder}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={res.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                View
              </a>

              <button
                onClick={() => handleDelete(res._id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>

              <button
                onClick={() => handleUpdate(res._id)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Replace
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}