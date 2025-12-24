import React, { useMemo, useState } from "react";

const categoryOptions = [
  "買い物",
  "光熱費",
  "食費",
  "交通費",
  "家賃",
  "医療費",
  "その他",
] as const;

type Category = (typeof categoryOptions)[number];
type EntryType = "expense" | "income";
type SortOrder = "asc" | "desc";

type FormState = {
  type: EntryType;
  amount: string; // inputは文字列で持つ
  category: "" | Category;
  date: string; // "YYYY-MM-DD"
};

type Item = {
  id: string;
  type: EntryType;
  amount: number;
  category: Category;
  date: string;
};

const initialValue: FormState = {
  type: "expense",
  amount: "",
  category: "",
  date: "",
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function compareDate(aDate: string, bDate: string, order: SortOrder): number {
  if (aDate === bDate) return 0;

  if (order === "desc") {
    // 新しい順（大きい日付が先）
    return aDate < bDate ? 1 : -1;
  }

  // 古い順
  return aDate < bDate ? -1 : 1;
}

function compareCategory(aCategory: Category, bCategory: Category): number {
  return aCategory.localeCompare(bCategory, "ja");
}

function compareEntry(a: Item, b: Item, order: SortOrder): number {
  const dateResult = compareDate(a.date, b.date, order);
  if (dateResult !== 0) return dateResult;

  const categoryResult = compareCategory(a.category, b.category);
  if (categoryResult !== 0) return categoryResult;

  return a.id.localeCompare(b.id);
}

export default function HouseholdAccounts() {
  const [form, setForm] = useState<FormState>(initialValue);
  const [items, setItems] = useState<Item[]>([]);
  const [dateSortOrder, setDateSortOrder] = useState<SortOrder>("desc");

  const sortedItems = useMemo(() => {
    const copied = [...items];
    copied.sort((a, b) => compareEntry(a, b, dateSortOrder));
    return copied;
  }, [items, dateSortOrder]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "type") {
        return { ...prev, type: value as EntryType };
      }
      if (name === "category") {
        // "" か Category のどちらか
        return { ...prev, category: value as FormState["category"] };
      }
      if (name === "amount") {
        return { ...prev, amount: value };
      }
      if (name === "date") {
        return { ...prev, date: value };
      }
      return prev;
    });
  }

  function handleAddItem() {
    // 入力チェック（空なら追加しない）
    if (!form.date || !form.category || !form.amount) return;

    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;

    const newItem: Item = {
      id: generateId(),
      type: form.type,
      amount: amountNum,
      category: form.category, // ここでは必ず Category になってる
      date: form.date,
    };

    setItems((prev) => [newItem, ...prev]);
    setForm(initialValue);
  }

  function handleSortOrderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDateSortOrder(e.target.value as SortOrder);
  }

  return (
    <div>
      <h1>家計簿アプリ</h1>

      <h2>入力フォーム</h2>

      <label>
        種別：
        <select name="type" value={form.type} onChange={handleFormChange}>
          <option value="expense">支出</option>
          <option value="income">収入</option>
        </select>
      </label>

      <br />

      <label>
        金額：
        <input
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleFormChange}
        />
      </label>

      <br />

      <label>
        カテゴリ：
        <select
          name="category"
          value={form.category}
          onChange={handleFormChange}
        >
          <option value="">未選択</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <br />

      <label>
        日付：
        <input
          name="date"
          type="date"
          value={form.date}
          onChange={handleFormChange}
        />
      </label>

      <br />

      <button onClick={handleAddItem}>追加</button>

      <h2>一覧</h2>

      <div>
        日付並び：
        <select value={dateSortOrder} onChange={handleSortOrderChange}>
          <option value="desc">新しい順</option>
          <option value="asc">古い順</option>
        </select>
      </div>

      {sortedItems.length === 0 ? (
        <p>データなし</p>
      ) : (
        <table border={1} cellPadding={6}>
          <thead>
            <tr>
              <th>日付</th>
              <th>カテゴリ</th>
              <th>種別</th>
              <th>金額</th>
            </tr>
          </thead>

          <tbody>
            {sortedItems.map((it) => (
              <tr key={it.id}>
                <td>{it.date}</td>
                <td>{it.category}</td>
                <td>{it.type === "expense" ? "支出" : "収入"}</td>
                <td>{it.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
