import EventCalender from "@/components/EventCalender";
import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const StudentPage = async () => {

  const {userId} = await auth()

  const classItem = await prisma.class.findMany({
    where:{
      students: { some: { id: userId!}},
    },
  });

  console.log(classItem);
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full min-w-0 xl:w-2/3">
        <div className="rounded-md bg-white p-4">
          <h1 className="text-xl font-semibold">Schedule (A4)</h1>
          <BigCalendarContainer type="classId" id={classItem[0].id} />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex w-full flex-col gap-8 xl:w-1/3">
        <EventCalender />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;