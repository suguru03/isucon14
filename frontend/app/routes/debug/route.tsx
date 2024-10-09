import { useState, useRef } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { Rating } from "~/components/primitives/rating/rating";

export const meta: MetaFunction = () => {
  return [
    { title: "Debug | ISURIDE" },
    { name: "description", content: "確認用ページ" },
  ];
};

export default function Index() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<{ close: () => void }>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="font-sans p-8">
      <div className="my-4">
        <Text bold size="sm" variant="danger">
          danger small bold text
        </Text>
      </div>
      <button
        className="bg-blue-500 text-white py-2 px-4 rounded mb-4"
        onClick={handleOpenModal}
      >
        Open Modal
      </button>

      {/* Ratingコンポーネント */}
      <Rating name="test" />

      {/* モーダルコンポーネント */}
      {isModalOpen && (
        <Modal ref={modalRef} onClose={onCloseModal}>
          <div className="text-center">
            <h2 className="text-xl font-bold">モーダルが表示されています</h2>
            <p>ここでコンテンツを追加できます。</p>
            <button
              className="mt-4 bg-red-500 text-white py-2 px-4 rounded"
              onClick={handleCloseModal}
            >
              Close Modal
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
