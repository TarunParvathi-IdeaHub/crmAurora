import DocumentVerificationClient from "./DocumentVerificationClient";

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default async function DocumentVerificationPage({ params }: Props) {
  const { applicationId } = await params;
  return <DocumentVerificationClient applicationId={applicationId} />;
}
