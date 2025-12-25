import React, { useMemo, useState } from "react";

// =====================
// ① 支出カテゴリ / 収入カテゴリ（分離）
// =====================
const expenseCategoryOptions = [
  "買い物",
  "光熱費",
  "食費",
  "交通費",
  "家賃",
  "医療費",
  "その他",
] as const;

const incomeCategoryOptions = [
  "給料",
  "賞与",
  "副業",
  "臨時収入",
  "その他収入",
] as const;

type ExpenseCategory = (typeof expenseCategoryOptions)[number];
type IncomeCategory = (typeof incomeCategoryOptions)[number];

type EntryType = "expense" | "income";
type SortOrder = "asc" | "desc";

// フォーム上では「未選択（""）」＋「支出カテゴリ」＋「収入カテゴリ」を許可する
type FormCategory = "" | ExpenseCategory | IncomeCategory;

type FormState = {
  type: EntryType;
  amount: string; // inputは文字列で持つ
  category: FormCategory;
  date: string; // "YYYY-MM-DD"
};

type ExpenseItem = {
  id: string;
  type: "expense";
  amount: number;
  category: ExpenseCategory;
  date: string;
};

type IncomeItem = {
  id: string;
  type: "income";
  amount: number;
  category: IncomeCategory;
  date: string;
};

type Item = ExpenseItem | IncomeItem;

// ★ここが重要：型注釈を必ず付ける（推論で category が "" 固定になるのを防ぐ）
const initialValue: FormState = {
  type: "expense",
  amount: "",
  category: "",
  date: "",
};

// =====================
// utils
// =====================
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function compareDate(aDate: string, bDate: string, order: SortOrder): number {
  if (aDate === bDate) return 0;
  if (order === "desc") return aDate < bDate ? 1 : -1;
  return aDate < bDate ? -1 : 1;
}

// 同日なら支出→収入
function compareType(aType: EntryType, bType: EntryType): number {
  if (aType === bType) return 0;
  return aType === "expense" ? -1 : 1;
}

// 支出/収入それぞれの候補配列の順番でカテゴリ比較
function compareCategory(a: Item, b: Item): number {
  if (a.type !== b.type) return compareType(a.type, b.type);

  if (a.type === "expense") {
    return (
      expenseCategoryOptions.indexOf(a.category) -
      expenseCategoryOptions.indexOf((b as ExpenseItem).category)
    );
  }
  return (
    incomeCategoryOptions.indexOf(a.category) -
    incomeCategoryOptions.indexOf((b as IncomeItem).category)
  );
}

function compareEntry(a: Item, b: Item, order: SortOrder): number {
  const dateResult = compareDate(a.date, b.date, order);
  if (dateResult !== 0) return dateResult;

  const typeResult = compareType(a.type, b.type);
  if (typeResult !== 0) return typeResult;

  const categoryResult = compareCategory(a, b);
  if (categoryResult !== 0) return categoryResult;

  // 安定化（IDでタイブレーク）
  return a.id.localeCompare(b.id);
}

// 型ガード（string → ExpenseCategory / IncomeCategory）
function isExpenseCategory(v: string): v is ExpenseCategory {
  return (expenseCategoryOptions as readonly string[]).includes(v);
}
function isIncomeCategory(v: string): v is IncomeCategory {
  return (incomeCategoryOptions as readonly string[]).includes(v);
}

// =====================
// component
// =====================
export default function HouseholdAccounts() {
  // ★ここも重要：useState<FormState> を明示
  const [form, setForm] = useState<FormState>(initialValue);
  const [items, setItems] = useState<Item[]>([]);
  const [dateSortOrder, setDateSortOrder] = useState<SortOrder>("desc");

  // 編集モード：編集中の行ID（nullなら追加モード）
  const [editingId, setEditingId] = useState<string | null>(null);

  // 一覧ソート
  const sortedItems = useMemo(() => {
    const copied = [...items];
    copied.sort((a, b) => compareEntry(a, b, dateSortOrder));
    return copied;
  }, [items, dateSortOrder]);

  // 合計（支出・収入・差額）
  const totals = useMemo(() => {
    let expenseTotal = 0;
    let incomeTotal = 0;

    for (const it of items) {
      if (it.type === "expense") expenseTotal += it.amount;
      else incomeTotal += it.amount;
    }

    return {
      expenseTotal,
      incomeTotal,
      net: incomeTotal - expenseTotal,
    };
  }, [items]);

  // =====================
  // handlers
  // =====================

  // input用
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "amount") return { ...prev, amount: value };
      if (name === "date") return { ...prev, date: value };
      return prev;
    });
  }

  // select用
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "type") {
        // 種別を変えたらカテゴリは一旦リセット
        return { ...prev, type: value as EntryType, category: "" };
      }
      if (name === "category") {
        // value は string なのでフォーム用の型に合わせてキャスト
        return { ...prev, category: value as FormCategory };
      }
      return prev;
    });
  }

  // 追加
  function handleAddItem() {
    if (!form.date || !form.amount || !form.category) return;

    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;

    const id = generateId();
    const date = form.date;

    if (form.type === "expense") {
      if (!isExpenseCategory(form.category)) return;

      const category = form.category; // ExpenseCategory に確定

      const newItem: ExpenseItem = {
        id,
        type: "expense",
        amount: amountNum,
        category,
        date,
      };

      setItems((prev) => [newItem, ...prev]);
      setForm(initialValue);
      return;
    }

    // income
    if (!isIncomeCategory(form.category)) return;

    const category = form.category; // IncomeCategory に確定

    const newItem: IncomeItem = {
      id,
      type: "income",
      amount: amountNum,
      category,
      date,
    };

    setItems((prev) => [newItem, ...prev]);
    setForm(initialValue);
  }

  // 編集開始：フォームに反映して編集モードにする
  function handleEditStart(item: Item) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      amount: String(item.amount),
      category: item.category, // FormCategory に入るのでOK
      date: item.date,
    });
  }

  // 更新：編集中の行IDと一致する行だけ差し替える
  function handleUpdateItem() {
    if (editingId === null) return;

    if (!form.date || !form.amount || !form.category) return;

    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;

    const id = editingId;
    const date = form.date;

    if (form.type === "expense") {
      if (!isExpenseCategory(form.category)) return;

      const category = form.category; // ExpenseCategory に確定

      // ★Union + ...it をやめて、明示的にExpenseItemを作る（赤波線対策）
      const updated: ExpenseItem = {
        id,
        type: "expense",
        amount: amountNum,
        category,
        date,
      };

      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));

      setEditingId(null);
      setForm(initialValue);
      return;
    }

    // income
    if (!isIncomeCategory(form.category)) return;

    const category = form.category; // IncomeCategory に確定

    const updated: IncomeItem = {
      id,
      type: "income",
      amount: amountNum,
      category,
      date,
    };

    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));

    setEditingId(null);
    setForm(initialValue);
  }

  // 編集キャンセル
  function handleCancelEdit() {
    setEditingId(null);
    setForm(initialValue);
  }

  // 日付並び替え
  function handleSortOrderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDateSortOrder(e.target.value as SortOrder);
  }

  // 表示するカテゴリ候補を type で切り替える
  const currentCategoryOptions =
    form.type === "expense" ? expenseCategoryOptions : incomeCategoryOptions;

  // =====================
  // render
  // =====================
  return (
    <div>
      <h1>家計簿アプリ</h1>

      <h2>入力フォーム</h2>
      {editingId !== null && (
        <p style={{ margin: "8px 0" }}>編集モード：更新 or キャンセル</p>
      )}

      <label>
        種別：
        <select name="type" value={form.type} onChange={handleSelectChange}>
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
          onChange={handleInputChange}
        />
      </label>

      <br />

      <label>
        カテゴリ：
        <select
          name="category"
          value={form.category}
          onChange={handleSelectChange}
        >
          <option value="">未選択</option>
          {currentCategoryOptions.map((c) => (
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
          onChange={handleInputChange}
        />
      </label>

      <br />

      {editingId !== null ? (
        <>
          <button onClick={handleUpdateItem}>更新</button>
          <button onClick={handleCancelEdit} style={{ marginLeft: 8 }}>
            キャンセル
          </button>
        </>
      ) : (
        <button onClick={handleAddItem}>追加</button>
      )}

      <h2>一覧</h2>

      {/* 合計表示 */}
      <div style={{ margin: "8px 0" }}>
        <div>支出合計：{totals.expenseTotal.toLocaleString()} 円</div>
        <div>収入合計：{totals.incomeTotal.toLocaleString()} 円</div>
        <div>差額（収入 - 支出）：{totals.net.toLocaleString()} 円</div>
      </div>

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
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            {sortedItems.map((it) => (
              <tr key={it.id}>
                <td>{it.date}</td>
                <td>{it.category}</td>
                <td>{it.type === "expense" ? "支出" : "収入"}</td>
                <td>{it.amount.toLocaleString()}</td>
                <td>
                  <button onClick={() => handleEditStart(it)}>編集</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
