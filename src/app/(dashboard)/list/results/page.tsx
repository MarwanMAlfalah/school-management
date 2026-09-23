import FormModel from "@/components/FormModel";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getAuthContext } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type ResultList = {
  id: number;
  title: string;
  studentName: string;
  studentSurname: string;
  teacherName: string;
  teacherSurname: string;
  score: number;
  className: string;
  startTime: Date;
};

const ResultListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { role, userId: currentUserId } = await getAuthContext();

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Score",
      accessor: "score",
      className: "hidden md:table-cell",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: ResultList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 text-sm even:bg-slate-50 hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.studentName + " " + item.studentSurname}</td>
      <td className="hidden px-4 md:table-cell">{item.score}</td>
      <td className="hidden px-4 md:table-cell">
        {item.teacherName + " " + item.teacherSurname}
      </td>
      <td className="hidden px-4 md:table-cell">{item.className}</td>
      <td className="hidden px-4 md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.startTime)}
      </td>

      <td className="px-4">
        <div className="flex items-center gap-2">
          {/* <Link href={`/list/teachers/${item.id}`}>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-lamaSky"
              aria-label={`View ${item.subject}`}
            >
              <Image src="/edit.png" alt="" width={16} height={16} />
            </button>
          </Link> */}

          {(role === "admin" || role === "teacher") && (
            <>
              <FormModel table="result" type="update" data={item} />
              <FormModel table="result" type="delete" id={item.id} />
            </>
            // <button
            //   type="button"
            //   className="flex h-7 w-7 items-center justify-center rounded-full bg-lamaPurple"
            //   aria-label={`Delete ${item.subject}`}
            // >
            //   <Image src="/delete.png" alt="" width={16} height={16} />
            // </button>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.ResultWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { exam: { title: { contains: value, mode: "insensitive" } } },
              { student: { name: { contains: value, mode: "insensitive" } } },
            ];
            break;
          case "studentId":
            query.studentId = value;
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.OR = [
        {exam: {lesson: {teacherId: currentUserId!}}},
        {assignment: {lesson: {teacherId: currentUserId!}}}
      ];
      break;
    case "student":
      query.studentId = currentUserId!;
      break;

    case "parent":
      query.student = {
        parentId: currentUserId!,
      };
    break;
    default:
    break;
  }
  const [dataRes, count] = await prisma.$transaction([
    prisma.result.findMany({
      where: query,
      include: {
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
        exam: {
          include: {
            lesson: {
              select: {
                class: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
              },
            },
          },
        },
        assignment: {
          include: {
            lesson: {
              select: {
                class: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
              },
            },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.result.count({ where: query }),
  ]);

  const data = dataRes.map((item) => {
    const assessment = item.exam || item.assignment;

    if (!assessment) return null;

    const isExam = "startTime" in assessment;

    return {
      id: item.id,
      title: assessment.title,
      studentName: item.student.name,
      studentSurname: item.student.surname,
      teacherName: assessment.lesson.teacher.name,
      teacherSurname: assessment.lesson.teacher.surname,
      score: item.score,
      className: assessment.lesson.class.name,
      startTime: isExam ? assessment.startTime : assessment.startDate,
    };
  });

  return (
    <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden text-lg font-semibold md:block">All Results</h1>

        <div className="flex w-full flex-col items-center gap-4 md:w-auto md:flex-row">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow"
            >
              <Image src="/filter.png" alt="Filter" width={14} height={14} />
            </button>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow"
            >
              <Image src="/sort.png" alt="Sort" width={14} height={14} />
            </button>

            {(role === "admin" || role === "teacher") && (
              <FormModel table="result" type="create" />

              // <button
              //   type="button"
              //   className="flex h-8 w-8 items-center justify-center rounded-full bg-lamaYellow"
              // >
              //   <Image
              //     src="/plus.png"
              //     alt="Add parent"
              //     width={14}
              //     height={14}
              //   />
              // </button>
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ResultListPage;
