import { useEffect, useMemo, useState } from "react";
import SideNav from "../../../components/SideNav/SideNav";
import { Link } from "react-router-dom";
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight, FaChevronDown, FaEye, FaSearch } from "react-icons/fa";
import baseUrl from "../../../api/api";

const PaginationButton = ({ children, active = false, disabled = false, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 min-w-9 items-center justify-center border px-3 text-sm transition ${
      active
        ? "border-[#1f1b22] bg-[#1f1b22] text-white"
        : disabled
        ? "border-gray-200 bg-gray-100 text-gray-300"
        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
    }`}
  >
    {children}
  </button>
);

const BranchAuditData = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [branches, setBranches] = useState([]);
  useEffect(() => {
    let mounted = true;

    const loadAudits = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl.baseUrl}api/admin/branch-audit`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load branches");
        }

        const json = await response.json();
        const list = Array.isArray(json?.data) ? json.data : [];

        if (!mounted) return;

        setBranches(
          list.map((item, index) => ({
            id: item?._id || item?.locCode || index + 1,
            storeName: item?.store || "N/A",
            overallRating: Number(item?.overallRating || 0),
            ratedBy: item?.ratedBy || "HR DEPARTMENT",
            createdOn: item?.createdOn || item?.ratedOn || item?.updatedAt
              ? new Date(item.updatedAt || item.createdAt || item.ratedOn || item.createdOn)
                  .toLocaleDateString("en-GB")
                  .replace(/\//g, "-")
              : "19-09-2025",
            ratedOn: item?.ratedOn || item?.createdOn || "",
            sections: Array.isArray(item?.sections) ? item.sections : [],
            auditorRemarks: item?.auditorRemarks || {},
            totalRatingsCount: Number(item?.totalRatingsCount || 0),
          }))
        );
      } catch {
        if (mounted) {
          setBranches([]);
        }
      }
    };

    loadAudits();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((row) => {
      const matchesSearch =
        !q ||
        row.storeName.toLowerCase().includes(q) ||
        row.ratedBy.toLowerCase().includes(q) ||
        String(row.overallRating).includes(q);
      const matchesFilter = filter === "All" || row.storeName === filter;
      return matchesSearch && matchesFilter;
    });
  }, [branches, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, rowsPerPage, safePage]);

  const totalEntries = filtered.length;

  return (
    <div className="min-h-screen bg-[#f7f7fb] font-[Poppins,sans-serif]">
      <SideNav />

      <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h1 className="text-[22px] font-bold leading-tight text-black">Store Audit List</h1>
            <Link
            to="/branch/audit/create"
              className="inline-flex items-center rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition hover:bg-gray-50"
            >
              + Add Audit
            </Link>
          </div>

          <div className="overflow-hidden rounded-[6px] border border-gray-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="px-4 py-6 sm:px-5">
              <div className="mb-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-0">
                <div className="flex w-full max-w-[700px] overflow-hidden rounded-[6px] border border-gray-300">
                  <div className="relative w-[190px] border-r border-gray-300 bg-white">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="w-full appearance-none bg-transparent px-4 py-2.5 pr-10 text-[14px] text-black outline-none"
                    >
                      <option value="All">All</option>
                    </select>
                    <FaChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  <div className="relative flex-1">
                    <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search"
                      className="w-full bg-white py-2.5 pl-12 pr-4 text-[14px] text-black outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-[14px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <Th label="#" />
                      <Th label="STORE NAME" />
                      <Th label="OVERALL RATING" />
                      <Th label="RATED BY" />
                      <Th label="CREATED ON" />
                      <Th label="ACTION" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, index) => (
                      <tr
                        key={row.id}
                        className={index % 2 === 0 ? "bg-[#f7f7f7]" : "bg-white"}
                        style={{ borderBottom: "1px solid #dbe3ea" }}
                      >
                        <Td center>{(safePage - 1) * rowsPerPage + index + 1}</Td>
                        <Td>{row.storeName}</Td>
                        <Td>{row.overallRating}</Td>
                        <Td>{row.ratedBy}</Td>
                        <Td>{row.createdOn}</Td>
                        <Td center>
                          <Link
                            to={`/branch/audit/${row.id}`}
                            className="inline-flex items-center justify-center rounded-full p-1 text-black transition hover:bg-gray-100"
                            aria-label={`View audit for ${row.storeName}`}
                          >
                            <FaEye size={15} />
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-black">
                  <span>Show</span>
                  <div className="relative">
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="appearance-none rounded-[4px] border border-gray-300 bg-white px-4 py-2 pr-9 text-[14px] font-normal text-black outline-none"
                    >
                      {[10, 25, 50].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  <span>entries</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <PaginationButton disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </PaginationButton>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <PaginationButton
                      key={n}
                      active={safePage === n}
                      onClick={() => setPage(Math.min(n, totalPages))}
                    >
                      {n}
                    </PaginationButton>
                  ))}
                  <PaginationButton disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </PaginationButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const Th = ({ label }) => (
  <th className="relative px-4 py-3 text-left text-[14px] font-semibold text-[#737373]">
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <span className="ml-1 inline-flex flex-col text-[8px] leading-[6px] text-gray-300">
        <span>▲</span>
        <span className="-mt-1">▼</span>
      </span>
    </div>
  </th>
);

const Td = ({ children, center = false }) => (
  <td className={`border-t border-gray-200 px-4 py-3 text-[14px] text-[#1f1f1f] ${center ? "text-center" : ""}`}>
    {children}
  </td>
);

export default BranchAuditData;
