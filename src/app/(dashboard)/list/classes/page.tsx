import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Class, Prisma, Teacher } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { role } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type ClassList = Class & { supervisor: Teacher };

const columns = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Capacity",
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Supervisor",
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
  ...(role === "admin"
    ? [
        {
          header: "Actions",
          accessor: "action",
        },
      ]
    : []),
];

const renderRow = (item: ClassList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 text-sm even:bg-slate-50 hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
      </div>
    </td>

    <td className="hidden px-4 md:table-cell">{item.capacity}</td>
    <td className="hidden px-4 md:table-cell">{item.name[0]}</td>
    <td className="hidden px-4 md:table-cell">
      {item.supervisor.name + " " + item.supervisor.surname}
    </td>

    <td className="px-4">
      <div className="flex items-center gap-2">
        {/* <Link href={`/list/teachers/${item.id}`}>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-lamaSky"
            aria-label={`View ${item.name}`}
          >
            <Image src="/view.png" alt="" width={16} height={16} />
          </button>
        </Link> */}

        {role === "admin" && (
          <>
          <FormContainer table="class" type="update" data={item} />
          <FormContainer table="class" type="delete" id={item.id} />
          </>

          // <button
          //   type="button"
          //   className="flex h-7 w-7 items-center justify-center rounded-full bg-lamaPurple"
          //   aria-label={`Delete ${item.name}`}
          // >
          //   <Image
          //     src="/delete.png"
          //     alt=""
          //     width={16}
          //     height={16}
          //   />
          // </button>
        )}
      </div>
    </td>
  </tr>
);

const ClassesListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.name = {
              contains: value,
              mode: "insensitive",
            };
            break;
          case "supervisorId":
            query.supervisorId = value;
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      include: {
        supervisor: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
  ]);

  return (
    <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden text-lg font-semibold md:block">All Classes</h1>

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

            {role === "admin" && (
              <FormContainer table="class" type="create" />

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

export default ClassesListPage;
