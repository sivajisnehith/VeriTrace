import numpy as np


class ComparisonService:

    def normalize_embedding(self, embedding):
        """
        Normalize a face embedding.
        """
        norm = np.linalg.norm(embedding)

        if norm == 0:
            raise ValueError("Cannot normalize a zero embedding.")

        return embedding / norm


    def cosine_similarity(self, embedding_1, embedding_2):
        """
        Calculate cosine similarity between two embeddings.
        """

        embedding_1 = self.normalize_embedding(embedding_1)
        embedding_2 = self.normalize_embedding(embedding_2)

        return float(
            np.dot(
                embedding_1,
                embedding_2
            )
        )


    def compare_reference_to_candidates(
        self,
        reference_embedding,
        candidate_faces
    ):
        """
        Compare one reference face against all candidate faces.
        """

        comparison_results = []

        for i, candidate_face in enumerate(
            candidate_faces,
            start=1
        ):

            similarity = self.cosine_similarity(
                reference_embedding,
                candidate_face.embedding
            )

            comparison_results.append({
                "face_number": i,
                "similarity": similarity,
                "detection_confidence": float(
                    candidate_face.det_score
                ),
                "bbox": candidate_face.bbox.astype(int).tolist()
            })


        comparison_results.sort(
            key=lambda result: result["similarity"],
            reverse=True
        )

        return comparison_results