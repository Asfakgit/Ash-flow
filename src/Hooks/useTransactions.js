import { useEffect, useState } from "react";
import { getTransactions } from "../Services/SheetService";

function useTransactions(refresh) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const res = await getTransactions();

        setTransactions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refresh]);

  return {
    transactions,
    loading,
    error,
  };
}

export default useTransactions;