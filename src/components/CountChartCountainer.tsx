import Image from "next/image";
import CountChart from "./CountChart";
import prisma from "@/lib/prisma";

const CountChartCountainer = async () => {
  const data = await prisma.student.groupBy({
    by: ["sex"],
    _count: true,
  });

  const boys = data.find((d) => d.sex === "MALE")?._count || 0;
  const girls = data.find((d) => d.sex === "FEMALE")?._count || 0;

  return (
    <div className="flex h-full w-full flex-col rounded-xl bg-white p-4">
      {/* TITLE */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Students</h1>

        <Image src="/moreDark.png" alt="More options" width={20} height={20} />
      </div>

      {/* CHART */}
      <CountChart boys={boys} girls={girls} />

      {/* BOTTOM */}
      <div className="flex justify-center gap-16 pb-3">
        <div className="flex flex-col gap-1">
          <div className="h-5 w-5 rounded-full bg-lamaSky" />

          <p className="font-bold">{boys}</p>

          <p className="text-xs text-gray-300">
            Boys ({Math.round((boys / (boys + girls)) * 100)}%)
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="h-5 w-5 rounded-full bg-lamaYellow" />

          <p className="font-bold">{girls}</p>

          <p className="text-xs text-gray-300">
            Girls ({Math.round((girls / (boys + girls)) * 100)}%)
          </p>
        </div>
      </div>
    </div>
  );
};

export default CountChartCountainer;
