import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { fetchAppPostUsers } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";

export default function ClientLoginForm() {
  const [username, setUsername] = useState<string>("");
  const [firstname, setFirstname] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const data = await fetchAppPostUsers({
      body: {
        date_of_birth: dateOfBirth,
        username,
        firstname,
        lastname,
      },
    });

    return navigate(`/client?id=${data.id}`);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          name="username"
          className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          onChange={(e) => setUsername(e.target.value)}
        />
        <label htmlFor="firstname">Firstname:</label>
        <input
          type="text"
          id="firstname"
          name="firstname"
          className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          onChange={(e) => setFirstname(e.target.value)}
        />
        <label htmlFor="lastname">Lastname:</label>
        <input
          type="text"
          id="lastname"
          name="lastname"
          className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          onChange={(e) => setLastname(e.target.value)}
        />
        <label htmlFor="date_of_birth">dateOfBirth:</label>
        <input
          type="text"
          id="date_of_birth"
          name="date_of_birth"
          className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </div>
      <Button onClick={() => void handleSubmit()}>登録</Button>
    </div>
  );
}
