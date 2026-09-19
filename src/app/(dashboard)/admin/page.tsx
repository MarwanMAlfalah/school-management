import Announcements from "@/components/Announcements";
import AttendanceChartCountainer from "@/components/AttendanceChartCountainer";
import CountChart from "@/components/CountChart";
import CountChartCountainer from "@/components/CountChartCountainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChart from "@/components/FinanceChart";
import UserCard from "@/components/UserCard";

const AdminPage = ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {

  return (
    <div className="flex flex-col gap-4 p-4 lg:flex-row">
      {/* LEFT SIDE */}
      <div className="flex w-full flex-col gap-8 lg:w-2/3">
        {/* USER CARDS */}
        <div className="flex flex-wrap justify-between gap-4">
          <UserCard type="admin" />
          <UserCard type="teacher" />
          <UserCard type="student" />
          <UserCard type="parent" />
        </div>

        {/* MIDDLE CHARTS */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* COUNT CHART */}
          <div className="h-[450px] w-full lg:w-1/3">
            <CountChartCountainer />
          </div>

          {/* ATTENDANCE CHART */}
          <div className="h-[450px] w-full lg:w-2/3">
            <AttendanceChartCountainer />
          </div>
        </div>

        {/* BOTTOM CHART */}
        <div className="w-full h-[500px]">
          {/* Bottom chart */}
          <FinanceChart />
          </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        {/* Right-side content */}
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;