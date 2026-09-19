"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import Image from "next/image";

const data = [
  {
    name: "Performance",
    value: 92,
    fill: "#C3EBFA",
  },
  {
    name: "Remaining",
    value: 8,
    fill: "#FAE27C",
  },
];

const Performance = () => {
  return (
    <div className="relative h-80 rounded-md bg-white p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Performance</h1>

        <Image
          src="/moreDark.png"
          alt="More options"
          width={16}
          height={16}
        />
      </div>

      {/* CHART */}
      <div className="relative h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="70%"
              innerRadius={65}
              outerRadius={90}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.fill}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* CENTER VALUE */}
        <div className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 text-center">
          <h1 className="text-3xl font-bold">9.2</h1>
          <p className="text-xs text-gray-400">
            of 10 max LTS
          </p>
        </div>
      </div>

      <h2 className="font-medium absolute bottom-16 left-0 right-0 m-auto text-center">
        1st Semester - 2nd Semester
      </h2>
    </div>
  );
};

export default Performance;