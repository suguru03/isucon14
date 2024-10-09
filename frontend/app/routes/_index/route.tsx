import { useState, useRef } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link, useLocation } from "@remix-run/react";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { Rating } from "~/components/primitives/rating/rating";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<{ close: () => void }>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isDebugMode = searchParams.get("debug") === "true";

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
    <div className="font-sans p-4">
      <h1 className="text-3xl">ISUCON 14 root</h1>
      <ul className="mt-4 list-disc ps-8">
        <li>
          <Link to="/client" className="text-blue-600 hover:underline">
            Client page
          </Link>
        </li>
        <li>
          <Link to="/driver" className="text-blue-600 hover:underline">
            Driver page
          </Link>
        </li>
      </ul>
      {isDebugMode && (
        <>
          <div className="my-4">
            <Text bold size="sm" variant="danger">
              danger small bold text
            </Text>
          </div>
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded"
            onClick={handleOpenModal}
          >
            Open Modal
          </button>

          {/* モーダルコンポーネント */}
          {isModalOpen && (
            <Modal ref={modalRef} onClose={onCloseModal}>
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  モーダルが表示されています
                </h2>
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

          <Rating name="test" />
        </>
      )}
    </div>
  );
}
