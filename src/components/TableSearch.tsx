"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const TableSearch = () => {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const value = formData.get("search")?.toString().trim() || "";

    const params = new URLSearchParams(window.location.search);

    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    params.set("page", "1");

    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center gap-2 rounded-full px-2 text-xs ring-[1.5px] ring-gray-300 md:w-auto"
    >
      <Image src="/search.png" alt="Search" width={14} height={14} />

      <input
        name="search"
        type="text"
        placeholder="Search..."
        className="w-[200px] bg-transparent p-2 outline-none"
      />
    </form>
  );
};

export default TableSearch;