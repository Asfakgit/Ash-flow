/* eslint-disable react-hooks/set-state-in-effect */
import { Grid, Box } from "@mui/material";
import { useEffect, useState } from "react";
import DashboardCard from "../Components/Dashboaedcard";
import { getRowVal, getDataRows } from "../Services/SheetService";

function Dashboard({ transactions = [] }) {
  const [totalLent, setTotalLent] = useState(0);
  const [totalBorrowed, setTotalBorrowed] = useState(0);

  useEffect(() => {
    const rows = getDataRows(transactions);

    let lent = 0;
    let borrowed = 0;

    rows.forEach((row) => {
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();

      if (type === "lent") {
        lent += amount;
      } else if (type === "borrowed") {
        borrowed += amount;
      }
    });

    setTotalLent(lent);
    setTotalBorrowed(borrowed);
  }, [transactions]);

  const balance = totalLent - totalBorrowed;

  return (
    <Box>
      <Grid container spacing={{ xs: 1.5, sm: 3 }} justifyContent="center">
        <Grid item xs={12} sm={4} md={3}>
          <DashboardCard title="Total Lent" amount={totalLent} type="lent" />
        </Grid>

        <Grid item xs={12} sm={4} md={3}>
          <DashboardCard title="Total Borrowed" amount={totalBorrowed} type="borrowed" />
        </Grid>

        <Grid item xs={12} sm={4} md={3}>
          <DashboardCard title="Net Balance" amount={balance} type="balance" />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
