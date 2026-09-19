"use client";

import Image from "next/image";
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";


const CountChart = ({boys, girls}: {boys:number, girls:number}) => {
  const data = [
    {
      name: "Total",
      count: boys+girls,
      fill: "#FFFFFF",
    },
    {
      name: "Girls",
      count: girls,
      fill: "#FAE27C",
    },
    {
      name: "Boys",
      count: boys,
      fill: "#C3EBFA",
    },
  ];
  return (
          <div className="relative min-h-0 flex-1">

    
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="100%"
            barSize={32}
            startAngle={0}
            endAngle={360}
          >
            <RadialBar
              dataKey="count"
              background={{ fill: "#EEEEEE" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <Image
          src="/maleFemale.png"
          alt="Male and female students"
          width={50}
          height={50}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      
  );
};

export default CountChart;