"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerificarPage() {
  const searchParams = useSearchParams();
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    const codigoURL = searchParams.get("codigo");
    if (codigoURL) {
      setCodigo(codigoURL);
    }
  }, [searchParams]);

  // ... other existing code ...

  // Assuming handleSubmit or similar uses codigo state directly now

  return (
    <>
      {/* ... other JSX ... */}
      <input
        type="text"
        placeholder="Ingresa el código de verificación"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        // ... other props ...
      />
      {/* ... other JSX ... */}
    </>
  );
}
