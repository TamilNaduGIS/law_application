<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Config\Database;
use App\Models\ApplicationModal;
use PDO;

class VacancyController extends Controller
{
  private const GENDER_MAP = [
    'Male' => 'Male',
    'Female' => 'Female',
    'Other' => 'Other',
    'M' => 'Male',
    'F' => 'Female',
    'O' => 'Other',
  ];

  public function getVacancies(Request $request): Response
  {
    $this->setUserId($request);
    $query = 'SELECT * FROM public.fn_get_available_posts()';
    $result = Database::ReadDatabaseConnection()->query($query);
    $data = $result->fetchAll(PDO::FETCH_ASSOC);
    return $this->encryptResponse($data);
  }

  public function getVacancyDetails(Request $request): Response
  {
    $this->setUserId($request);
    $data = $this->requestData;
    $applicantId = (string) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? ''
    );

    if ($applicantId === '') {
      return $this->encryptResponse([
        'error' => 'Applicant ID is required',
      ]);
    }

    $query = 'SELECT * FROM public.applicant_registration WHERE applicant_id = :applicantId';
    $stmt = Database::ReadDatabaseConnection()->prepare($query);
    $stmt->bindParam(':applicantId', $applicantId, PDO::PARAM_STR);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $this->encryptResponse($row ?: []);
  }

  /**
   * POST /api/vacancy/education/get
   * Reads public.fn_application_get_education_details(applicant_id).
   * Also attempts public.fn_application_get_additional_qualification_details when available.
   */
  public function getEducationDetails(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];

    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $qualifications = ApplicationModal::getTab2Qualifications($applicantId);
    $education = $qualifications['education'];
    $additional = $qualifications['additional_qualification'];
    $applicationId = ApplicationModal::resolveApplicationId($applicantId, $data);

    return $this->encryptResponse([
      'ok' => true,
      'applicant_id' => $applicantId,
      'application_id' => $applicationId > 0 ? $applicationId : null,
      'education' => $education,
      'additional_qualification' => $additional,
    ]);
  }

  public function savePersonalInfo(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];
    
    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $applicationId = ApplicationModal::resolveApplicationId($applicantId, $data);

    $payload = $this->buildPersonalInfoPayload($data, $applicantId, $applicationId);
    $result = ApplicationModal::savePersonalInfo($payload);
    $result['application_id'] = $applicationId;
    $result['applicant_id'] = $applicantId;

    return $this->encryptResponse($result);
  }

  public function uploadDocument(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];

    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $applicationId = ApplicationModal::resolveApplicationId($applicantId, $data);
    if ($applicationId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Invalid Application Id. Save Tab 1 first.']);
    }

    $documentType = strtoupper(trim((string) ($data['document_type'] ?? $data['documentType'] ?? '')));
    $fileName = trim((string) ($data['file_name'] ?? $data['fileName'] ?? ''));
    $fileContent = (string) ($data['file_content'] ?? $data['fileContent'] ?? $data['file_base64'] ?? '');

    if ($documentType === '') {
      return $this->encryptResponse(['ok' => false, 'error' => 'Document type is required.']);
    }

    if ($fileName === '' || $fileContent === '') {
      return $this->encryptResponse(['ok' => false, 'error' => 'File name and content are required.']);
    }

    $stored = $this->storeUploadedFile($applicationId, $documentType, $fileName, $fileContent);
    if (!$stored['ok']) {
      return $this->encryptResponse($stored);
    }

    $uploadedBy = (int) ($data['uploaded_by'] ?? $data['uploadedBy'] ?? $this->sessionUserId ?? 0);

    $result = ApplicationModal::uploadDocument([
      'application_id' => $applicationId,
      'document_type' => $documentType,
      'file_name' => $stored['file_name'],
      'file_path' => $stored['file_path'],
      'uploaded_by' => $uploadedBy > 0 ? $uploadedBy : null,
    ]);

    if ($result['ok']) {
      $result['file_path'] = $stored['file_path'];
      $result['file_name'] = $stored['file_name'];
    }

    return $this->encryptResponse($result);
  }

  /**
   * @param array<string, mixed> $data
   * @return array<string, mixed>
   */
  private function buildPersonalInfoPayload(array $data, int $applicantId, int $applicationId): array
  {

   
    $enrolment = strtoupper(trim((string) (
      $data['bar_council_enrollement_number']
      ?? $data['enrollment_no']
      ?? $data['enrolment_no']
      ?? $data['enrolmentNo']
      ?? ''
    )));

    $genderRaw = (string) ($data['gender'] ?? '');
    $dobRaw = trim((string) ($data['dob'] ?? $data['date_of_birth'] ?? ''));
    $photoPath = trim((string) ($data['photo_path'] ?? $data['photoPath'] ?? ''));

    $createdBy = (int) ($data['created_by'] ?? $data['createdBy'] ?? $applicantId);

    return [
      'application_id' => $applicationId,
      'applicant_name' => trim((string) ($data['applicant_name'] ?? $data['advocateName'] ?? '')),
      'bar_council_enrollement_number' => $enrolment,
      'father_name' => trim((string) ($data['father_name'] ?? $data['fatherName'] ?? '')),
      'gender' => self::GENDER_MAP[$genderRaw] ?? $genderRaw,
      'dob' => $this->formatDobForProcedure($dobRaw),
      'nationality' => trim((string) ($data['nationality'] ?? 'Indian')) ?: 'Indian',
      'religion' => trim((string) ($data['religion'] ?? '')),
      'community' => trim((string) ($data['community'] ?? '')),
      'photo_path' => $photoPath,
      'mobile_no' => trim((string) ($data['mobile_no'] ?? $data['mobile'] ?? '')),
      'phone_number' => trim((string) ($data['phone_number'] ?? $data['phone_no'] ?? $data['phone'] ?? '')),
      'email_id' => trim((string) ($data['email_id'] ?? $data['email'] ?? '')),
      'pan_number' => strtoupper(trim((string) ($data['pan_number'] ?? $data['pan_no'] ?? $data['pan'] ?? ''))),
      'office_district' => trim((string) ($data['office_district'] ?? $data['officeDistrict'] ?? '')),
      'office_pincode' => trim((string) ($data['office_pincode'] ?? $data['officePincode'] ?? '')),
      'office_address' => trim((string) ($data['office_address'] ?? $data['officeAddress'] ?? '')),
      'permanent_district' => trim((string) ($data['permanent_district'] ?? $data['permanentDistrict'] ?? '')),
      'permanent_pincode' => trim((string) ($data['permanent_pincode'] ?? $data['permanentPincode'] ?? '')),
      'permanent_address' => trim((string) ($data['permanent_address'] ?? $data['permanentAddress'] ?? '')),
      'created_by' => $createdBy > 0 ? $createdBy : $applicantId,
    ];
  }

  private function formatDobForProcedure(string $dob): string
  {
    if ($dob === '') {
      return '';
    }

    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $dob, $matches)) {
      return $matches[3] . '-' . $matches[2] . '-' . $matches[1];
    }

    return $dob;
  }

  /**
   * @return array{ok: bool, file_name?: string, file_path?: string, error?: string}
   */
  private function storeUploadedFile(int $applicationId, string $documentType, string $fileName, string $fileContent): array
  {
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($fileName));
    if ($safeName === '' || $safeName === '.' || $safeName === '..') {
      $safeName = 'document.bin';
    }

    if (preg_match('/^data:([^;]+);base64,(.+)$/s', $fileContent, $matches)) {
      $fileContent = $matches[2];
    }

    $binary = base64_decode($fileContent, true);
    if ($binary === false) {
      return ['ok' => false, 'error' => 'Invalid file content.'];
    }

    $maxBytes = $documentType === 'PHOTO' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (strlen($binary) > $maxBytes) {
      return ['ok' => false, 'error' => 'File exceeds maximum allowed size.'];
    }

    $uploadRoot = dirname(__DIR__, 2) . '/public/uploads/applicants/' . $applicationId;
    if (!is_dir($uploadRoot) && !mkdir($uploadRoot, 0755, true) && !is_dir($uploadRoot)) {
      return ['ok' => false, 'error' => 'Unable to create upload directory.'];
    }

    $storedName = $documentType . '_' . time() . '_' . $safeName;
    $fullPath = $uploadRoot . '/' . $storedName;

    if (file_put_contents($fullPath, $binary) === false) {
      return ['ok' => false, 'error' => 'Failed to save uploaded file.'];
    }

    $relativePath = 'uploads/applicants/' . $applicationId . '/' . $storedName;

    return [
      'ok' => true,
      'file_name' => $safeName,
      'file_path' => $relativePath,
    ];
  }

  /**
   * POST /api/vacancy/education/delete
   * Body: { "applicant_id": 2, "education_id": 5 } or { "education_ids": [5, 6] }
   */
  public function deleteEducation(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];

    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $educationIds = $this->collectRecordIds(
      $data,
      ['education_id', 'educationId'],
      ['education_ids', 'educationIds']
    );

    if ($educationIds === []) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Education ID is required.']);
    }

    $result = ApplicationModal::deleteEducationRecords($applicantId, $educationIds);
    $result['applicant_id'] = $applicantId;

    return $this->encryptResponse($result);
  }

  /**
   * POST /api/vacancy/additional/delete
   * Body: { "applicant_id": 2, "additional_qualification_id": 3 }
   */
  public function deleteAdditionalQualification(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];

    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $additionalIds = $this->collectRecordIds(
      $data,
      [
        'add_qualification_id',
        'addQualificationId',
        'additional_qualification_id',
        'additionalQualificationId',
        'additional_id',
      ],
      [
        'add_qualification_ids',
        'addQualificationIds',
        'additional_qualification_ids',
        'additionalQualificationIds',
        'additional_ids',
      ]
    );

    if ($additionalIds === []) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Additional qualification ID is required.']);
    }

    $result = ApplicationModal::deleteAdditionalQualificationRecords($applicantId, $additionalIds);
    $result['applicant_id'] = $applicantId;

    return $this->encryptResponse($result);
  }

  /**
   * @param array<string, mixed> $data
   * @param array<int, string> $singleKeys
   * @param array<int, string> $listKeys
   * @return array<int, int>
   */
  private function collectRecordIds(array $data, array $singleKeys, array $listKeys): array
  {
    $ids = [];

    foreach ($singleKeys as $key) {
      if (!empty($data[$key])) {
        $ids[] = (int) $data[$key];
      }
    }

    foreach ($listKeys as $key) {
      if (!isset($data[$key]) || !is_array($data[$key])) {
        continue;
      }
      foreach ($data[$key] as $value) {
        $ids[] = (int) $value;
      }
    }

    return array_values(array_unique(array_filter($ids, static fn (int $id): bool => $id > 0)));
  }

  public function saveEducation(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];

    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $createdBy = (int) ($data['created_by'] ?? $data['createdBy'] ?? $applicantId);

    $payload = [
      'applicant_id' => $applicantId,
      'created_by' => $createdBy > 0 ? $createdBy : $applicantId,
      'education' => $this->normalizeEducationRows((array) ($data['education'] ?? [])),
    ];

    $result = ApplicationModal::saveEducation($payload);
    $result['applicant_id'] = $applicantId;

    return $this->encryptResponse($result);
  }

  /**
   * POST /api/vacancy/additional/save
   * Calls public.sp_application_save_additional_qualification(p_input jsonb, p_output jsonb).
   *
   * Expected p_input:
   * {
   *   "applicant_id": 2,
   *   "created_by": 2,
   *   "additional_qualification": [
   *     {
   *       "additional_qualification_id": 0,
   *       "qualification_name": "LLM",
   *       "year_of_passing": 2020,
   *       "university_name": "Madras University",
   *       "institution": "Government Law College",
   *       "specialization": "Constitutional Law",
   *       "marks_percentage": 82.0,
   *       "certificate_path": "uploads/llm_certificate.pdf"
   *     }
   *   ]
   * }
   */
  public function saveAdditionalQualification(Request $request): Response
  {
    $this->setUserId($request);
    $data = is_array($this->requestData) ? $this->requestData : [];

    $applicantId = (int) (
      $data['applicant_id']
      ?? $data['applicantId']
      ?? $this->sessionUserId
      ?? 0
    );

    if ($applicantId <= 0) {
      return $this->encryptResponse(['ok' => false, 'error' => 'Applicant ID is required.']);
    }

    $createdBy = (int) ($data['created_by'] ?? $data['createdBy'] ?? $applicantId);

    $additionalRows = array_values((array) (
      $data['additional_qualification']
      ?? $data['additionalQualification']
      ?? $data['additional']
      ?? []
    ));

    $normalizedRows = $this->normalizeAdditionalQualificationRows($additionalRows);
    if ($normalizedRows === []) {
      return $this->encryptResponse([
        'ok' => true,
        'skipped' => true,
        'message' => 'No additional qualifications to save.',
        'applicant_id' => $applicantId,
      ]);
    }

    $payload = [
      'applicant_id' => $applicantId,
      'created_by' => $createdBy > 0 ? $createdBy : $applicantId,
      'additional_qualification' => $normalizedRows,
    ];

    $result = ApplicationModal::saveAdditionalQualification($payload);
    $result['applicant_id'] = $applicantId;

    return $this->encryptResponse($result);
  }

  /**
   * @param array<int, mixed> $rows
   * @return array<int, array<string, mixed>>
   */
  private function normalizeEducationRows(array $rows): array
  {
    $normalized = [];

    foreach ($rows as $row) {
      if (!is_array($row)) {
        continue;
      }

      $item = [
        'education_id' => (int) ($row['education_id'] ?? $row['educationId'] ?? 0),
        'qualification_name' => trim((string) ($row['qualification_name'] ?? $row['qualificationName'] ?? '')),
        'year_of_passing' => (int) ($row['year_of_passing'] ?? $row['yearOfPassing'] ?? 0),
        'university_name' => trim((string) ($row['university_name'] ?? $row['universityName'] ?? '')),
        'institution' => trim((string) ($row['institution'] ?? $row['institution_name'] ?? $row['institutionName'] ?? '')),
        'specialization' => trim((string) ($row['specialization'] ?? '')),
        'marks_percentage' => (float) ($row['marks_percentage'] ?? $row['marksPercentage'] ?? 0),
        'certificate_path' => trim((string) ($row['certificate_path'] ?? $row['certificatePath'] ?? '')),
      ];

      if (array_key_exists('is_deleted', $row) || array_key_exists('isDeleted', $row)) {
        $item['is_deleted'] = filter_var($row['is_deleted'] ?? $row['isDeleted'] ?? false, FILTER_VALIDATE_BOOLEAN);
      }

      $normalized[] = $item;
    }

    return $normalized;
  }

  /**
   * @param array<int, mixed> $rows
   * @return array<int, array<string, mixed>>
   */
  private function normalizeAdditionalQualificationRows(array $rows): array
  {
    $normalized = [];

    foreach ($rows as $row) {
      if (!is_array($row)) {
        continue;
      }

      $addId = (int) (
        $row['add_qualification_id']
        ?? $row['addQualificationId']
        ?? $row['additional_qualification_id']
        ?? $row['additionalQualificationId']
        ?? 0
      );

      $item = [
        'add_qualification_id' => $addId,
        'additional_qualification_id' => $addId,
        'qualification_name' => trim((string) ($row['qualification_name'] ?? $row['qualificationName'] ?? '')),
        'year_of_passing' => (int) ($row['year_of_passing'] ?? $row['yearOfPassing'] ?? 0),
        'board_university' => trim((string) (
          $row['board_university']
          ?? $row['university_name']
          ?? $row['universityName']
          ?? ''
        )),
        'institution_name' => trim((string) (
          $row['institution_name']
          ?? $row['institution']
          ?? $row['institutionName']
          ?? ''
        )),
        'subject_name' => trim((string) (
          $row['subject_name']
          ?? $row['specialization']
          ?? ''
        )),
        'marks_percentage' => (float) ($row['marks_percentage'] ?? $row['marksPercentage'] ?? 0),
        'certificate_path' => trim((string) ($row['certificate_path'] ?? $row['certificatePath'] ?? '')),
      ];

      if (array_key_exists('is_deleted', $row) || array_key_exists('isDeleted', $row)) {
        $item['is_deleted'] = filter_var($row['is_deleted'] ?? $row['isDeleted'] ?? false, FILTER_VALIDATE_BOOLEAN);
      }

      $normalized[] = $item;
    }

    return $normalized;
  }
}
