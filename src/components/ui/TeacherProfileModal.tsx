import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './TeacherProfileModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TeacherProfileModal({ isOpen, onClose }: Props) {
  const { teacher, setTeacher, addToast } = useStore();
  const [name, setName] = useState(teacher.name);
  const [sexo, setSexo] = useState<'M' | 'F' | ''>(teacher.sexo);

  const handleSave = () => {
    setTeacher({ name: name.trim(), sexo });
    addToast({ type: 'success', message: 'Perfil docente guardado ✓' });
    onClose();
  };

  // Sync local state when modal opens
  const handleOpen = () => {
    setName(teacher.name);
    setSexo(teacher.sexo);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil Docente"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Guardar</Button>
        </>
      }
    >
      <div className={styles.body} onAnimationStart={handleOpen}>
        <p className={styles.hint}>
          Tu nombre y género se usarán en el <strong>Mega Prompt</strong> para que la IA personalice correctamente el feedback pedagógico,
          y aparecerán en los <strong>informes PDF y Word</strong>.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="teacher-name">Nombre completo</label>
          <input
            id="teacher-name"
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Carlos Andrés Muñoz"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Género</label>
          <div className={styles.sexoGroup}>
            {[
              { value: 'M', label: '♂ Masculino' },
              { value: 'F', label: '♀ Femenino' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`${styles.sexoBtn} ${sexo === opt.value ? styles.sexoBtnSelected : ''}`}
                onClick={() => setSexo(opt.value as 'M' | 'F')}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
